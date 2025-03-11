// const http = require('http');
// const express = require('express');
// const mngAPI = express();

// const Docker = require("dockerode")
// const docker = new Docker({socketPath : '/var/run/docker.sock'})

// const db = new Map()
// const httpProxy = require('http-proxy');
// const proxy = httpProxy.createProxy({});

// docker.getEvents(function(err,stream){
//     if(err){
//         console.log(`Error in getting events`,err);
//         return;
//     }
//     stream.on('data',async(chunck)=>{
//         try {
//             if(!chunck) return;
//             const event  = JSON.parse(chunck.toString());

//             if(event.Type === 'container' && event.Action == 'start'){
//                 const container = docker.getContainer(event.id);
//                 const containerInfo = await container.inspect();
//                 const containerName  = containerInfo.Name.substring(1);
//                 const ipAddress = containerInfo.NetworkSettings.IPAddress;
        
//                 const exposePort = Object.keys(containerInfo.Config.ExposedPorts)
//                 let defaultPort = null ;
//                 if(exposePort && exposePort.length > 0){
//                     const [port,type] = exposePort[0].split('/')
//                     if(type === 'tcp'){
//                         defaultPort = port;
//                     }
//                 }

//                 console.log(`Registering ${containerName}.localhost --> http://${ipAddress}:${defaultPort}`);
//                 db.set(containerName,{containerName, ipAddress,defaultPort})
//             }
//         } catch (error) {
//             console.log(error)
//         }
//     })
// } )


// const reverseProxyApp = express();

// reverseProxyApp.use(function(req,res){
//     const hostname = req.hostname;
//     const subdomain = hostname.split('.')[0];

//     if(!db.has(subdomain)) return res.status(404).end(404);

//     const {ipAddress, defaultPort} = db.get(subdomain);
    
//     const target = `http://${ipAddress}:${defaultPort}`

//     console.log(`Forwading ${hostname}-> ${target}`)

//     return proxy.web(req,res , {target, changeOrigin:true, ws:true })

// })

// // reverse rpoxy 
// const reverseProxy = http.createServer(reverseProxyApp);


// reverseProxy.on('upgrade',(req,socket, head)=>{
//     const hostname = req.headers.host;
//     const subdomain = hostname.split(".")[0];
//     if(!db.has(subdomain)) return res.status(404).end(404);
//     const {ipAddress, defaultPort} = db.get(subdomain);
//     const target = `http://${ipAddress}:${defaultPort}`
//     return proxy.ws(req,socket,head,{
//         target:target,
//         ws:true
//     })

// })

// mngAPI.use(express.json())

// mngAPI.post('/containers',async (req,res)=>{
//     const {image, tag="latest"} = req.body;
//     // check imahge is exist ont not 

//     let imageExist = false;

//     const images = await docker.listImages();

//     for(const systemImage of images){
//         for(const systemTag of systemImage.RepoTags){
//             if(systemTag === `${image}:${tag}`) imageExist = true;
//             break;
//         }
//         if(imageExist) break;
//     }

//     // if not exist then pull
//     if(!imageExist){
//         await docker.pull(`${image}:${tag}`)
//     }

//     const container = await docker.createContainer({
//          Image:`${image}:${tag}`,
//         Tty:false,
//         HostConfig:{
//             AutoRemove:true
//         }
//     })
//     await container.start()

//     return res.json({
//         status :'success', 
//         container: `${(await container.inspect()).Name}.localhost`
//     })
// })

// mngAPI.listen(8080,()=>{
//     console.log('mngAPI listning on 8080')
// })


// reverseProxy.listen(80 , ()=>{
//     console.log('reverseProxy listning on 80')
// })







//   

const express = require('express');
const http = require('http');
const Docker = require('dockerode');
const httpProxy = require('http-proxy');
const cors = require('cors');
const morgan = require('morgan');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const db = new Map();
const containerEvents = new Map();
const logs = [];

const app = express();
const proxy = httpProxy.createProxy({});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Event logging function
const logEvent = (level, message) => {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    id: Date.now()
  };
  logs.unshift(log);
  if (logs.length > 1000) logs.pop(); // Keep last 1000 logs
};

// Docker events monitoring
docker.getEvents((err, stream) => {
  if (err) {
    logEvent('error', `Failed to connect to Docker events: ${err.message}`);
    return;
  }

  stream.on('data', async (chunk) => {
    try {
      if (!chunk) return;
      const event = JSON.parse(chunk.toString());
      
      if (event.Type === 'container') {
        const container = docker.getContainer(event.id);
        const containerInfo = await container.inspect();
        const containerName = containerInfo.Name.substring(1);
        
        switch (event.Action) {
          case 'start':
            const ipAddress = containerInfo.NetworkSettings.IPAddress;
            const networks = containerInfo.NetworkSettings.Networks;
            const exposedPorts = containerInfo.Config.ExposedPorts;
            let defaultPort = null;

            if (exposedPorts) {
              const portKey = Object.keys(exposedPorts)[0];
              if (portKey) {
                const [port] = portKey.split('/');
                defaultPort = port;
              }
            }

            // Get the bridge network IP if available
            const bridgeNetwork = networks.bridge;
            const effectiveIP = bridgeNetwork ? bridgeNetwork.IPAddress : ipAddress;

            if (effectiveIP && defaultPort) {
              db.set(containerName, {
                containerName,
                ipAddress: effectiveIP,
                defaultPort,
                status: 'running',
                startTime: new Date().toISOString()
              });
              logEvent('info', `Container ${containerName} started and registered`);
            }
            break;

          case 'die':
          case 'stop':
            db.delete(containerName);
            logEvent('info', `Container ${containerName} stopped and unregistered`);
            break;
        }
        
        // Store event for statistics
        containerEvents.set(Date.now(), event.Action);
      }
    } catch (error) {
      logEvent('error', `Error processing Docker event: ${error.message}`);
    }
  });
});

// API Routes
// Get system statistics
app.get('/api/stats', async (req, res) => {
  try {
    const containers = await docker.listContainers();

    // get the all images 
    const images = await docker.listImages();
    
    // Calculate request statistics
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentEvents = Array.from(containerEvents.entries())
      .filter(([timestamp]) => timestamp > last24h);
    
    const stats = {
      activeContainers: containers.length,
      totalImages: images.length,
      containerEvents: recentEvents.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    logEvent('error', `Error fetching system stats: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get all containers
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const containerDetails = containers.map(container => ({
      id: container.Id,
      names: container.Names,
      image: container.Image,
      state: container.State,
      status: container.Status,
      ports: container.Ports,
      created: container.Created
    }));
    res.json(containerDetails);
  } catch (error) {
    logEvent('error', `Error listing containers: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Create new container
app.post('/api/containers', async (req, res) => {
  try {
    const { image, tag = 'latest', name, env = [], ports = [] } = req.body;
    
    // Check if image exists
    let imageExists = false;
    const images = await docker.listImages();
    imageExists = images.some(img => 
      img.RepoTags && img.RepoTags.includes(`${image}:${tag}`)
    );

    if (!imageExists) {
      logEvent('info', `Pulling image ${image}:${tag}`);
      await new Promise((resolve, reject) => {
        docker.pull(`${image}:${tag}`, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });
    }

    // Create and start container
    const container = await docker.createContainer({
      Image: `${image}:${tag}`,
      name,
      Env: env,
      // ExposedPorts: ports.reduce((acc, port) => {
      //   acc[`${port}/tcp`] = {};
      //   return acc;
      // }, {}),
      HostConfig: {
        AutoRemove: true,
        // PortBindings: ports.reduce((acc, port) => {
        //   acc[`${port}/tcp`] = [{ HostPort: '' }];
        //   return acc;
        // }, {})
      }
    });

    await container.start();
    const containerInfo = await container.inspect();
    
    logEvent('info', `Container ${name} created successfully`);
    res.json({
      status: 'success',
      container: `${containerInfo.Name.substring(1)}.localhost`,
      containerId: containerInfo.Id
    });
  } catch (error) {
    logEvent('error', `Error creating container: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Delete container
app.delete('/api/containers/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop();
    await container.remove();
    logEvent('info', `Container ${req.params.id} removed`);
    res.json({ status: 'success' });
  } catch (error) {
    logEvent('error', `Error removing container: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Get logs
app.get('/api/logs', (req, res) => {
  const { level, limit = 100 } = req.query;
  let filteredLogs = logs;
  
  if (level && level !== 'all') {
    filteredLogs = logs.filter(log => log.level === level);
  }
  
  res.json(filteredLogs.slice(0, parseInt(limit)));
});



// Reverse proxy setup
const reverseProxyApp = express();
reverseProxyApp.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split('.')[0];
  
  if (!db.has(subdomain)) {
    logEvent('warning', `Invalid subdomain request: ${subdomain}`);
    return res.status(404).send('Not Found');
  }
  
  const { ipAddress, defaultPort } = db.get(subdomain);
  const target = `http://${ipAddress}:${defaultPort}`;
  logEvent('info', `Proxying request: ${hostname} -> ${target}`);
  
  return proxy.web(req, res, { target, changeOrigin: true, ws: true });
});

// Create servers
const managementServer = http.createServer(app);
const proxyServer = http.createServer(reverseProxyApp);

// WebSocket support
proxyServer.on('upgrade', (req, socket, head) => {
  const hostname = req.headers.host;
  const subdomain = hostname.split('.')[0];
  
  if (!db.has(subdomain)) {
    socket.end();
    return;
  }
  
  const { ipAddress, defaultPort } = db.get(subdomain);
  const target = `http://${ipAddress}:${defaultPort}`;
  
  proxy.ws(req, socket, head, { target, ws: true });
});

// Start servers
managementServer.listen(8080, () => {
  logEvent('info', 'Management API listening on port 8080');
});

proxyServer.listen(80, () => {
  logEvent('info', 'Reverse proxy listening on port 80');
});
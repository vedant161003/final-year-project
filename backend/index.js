
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

    // Convert ports array to Docker-compatible structures
    const exposedPorts = ports.reduce((acc, port) => {
      acc[`${port}/tcp`] = {};
      return acc;
    }, {});

    const portBindings = ports.reduce((acc, port) => {
      acc[`${port}/tcp`] = [{ HostPort: port }];
      return acc;
    }, {});

    // Create and start container
    const container = await docker.createContainer({
      Image: `${image}:${tag}`,
      name,
      Env: env,
      ExposedPorts: exposedPorts,
      HostConfig: {
        AutoRemove: true,
        PortBindings: portBindings
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

// logs of a container
app.get('/api/containers/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(id);
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
      tail: 100
    });
    res.send(stream.toString('utf8'));
  } catch (error) {
    logEvent('error', `Error fetching container logs: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// stats of a container
app.get('/api/containers/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(id);
    const stream = await container.stats({ stream: false });
    res.json(stream);
  } catch (error) {
    logEvent('error', `Error fetching stats for container ${id}: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});


// List images with size and tag info
app.get('/api/images', async (req, res) => {
  try {
    const images = await docker.listImages({ all: true });
    res.json(images.map(img => ({
      id: img.Id,
      tags: img.RepoTags,
      size: img.Size,
      created: img.Created
    })));
  } catch (error) {
    logEvent('error', `Error fetching images: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Delete an image
app.delete('/api/images/:id', async (req, res) => {
  try {
    await docker.getImage(req.params.id).remove();
    logEvent('info', `Image ${req.params.id} removed`);
    res.json({ status: 'success' });
  } catch (error) {
    logEvent('error', `Error deleting image: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/docker-info', async (req, res) => {
  try {
    const info = await docker.info();
    const version = await docker.version();
    res.json({ info, version });
  } catch (error) {
    logEvent('error', `Error fetching Docker info: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/volumes', async (req, res) => {
  try {
    const volumes = await docker.listVolumes();
    res.json(volumes);
  } catch (error) {
    logEvent('error', `Error fetching volumes: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/networks', async (req, res) => {
  try {
    const networks = await docker.listNetworks();
    res.json(networks);
  } catch (error) {
    logEvent('error', `Error fetching networks: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});



app.get('/api/events', (req, res) => {
  const { type, since } = req.query;
  let filtered = Array.from(containerEvents.entries());

  if (since) {
    const sinceTimestamp = parseInt(since, 10);
    filtered = filtered.filter(([ts]) => ts >= sinceTimestamp);
  }

  const formatted = filtered.map(([ts, action]) => ({
    timestamp: new Date(ts).toISOString(),
    action
  }));

  res.json(formatted);
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
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Typography,
  Row,
  Col,
  Card,
  Table,
  List,
  Alert,
  Divider,
  Spin,
  Tag,
} from 'antd';
import {
  InfoCircleOutlined,
  HddOutlined,
  DatabaseOutlined,
  ClusterOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

function DockerOverview() {
  const [images, setImages] = useState([]);
  const [info, setInfo] = useState(null);
  const [version, setVersion] = useState(null);
  const [volumes, setVolumes] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDockerData = async () => {
      try {
        setLoading(true);
        const [
          imageRes,
          infoRes,
          volumeRes,
          networkRes,
          eventRes
        ] = await Promise.all([
          axios.get('http://localhost:8080/api/images'),
          axios.get('http://localhost:8080/api/docker-info'),
          axios.get('http://localhost:8080/api/volumes'),
          axios.get('http://localhost:8080/api/networks'),
          axios.get('http://localhost:8080/api/events?since=' + (Date.now() - 86400000))
        ]);

        setImages(imageRes.data);
        setInfo(infoRes.data.info);
        setVersion(infoRes.data.version);
        setVolumes(volumeRes.data?.Volumes ?? volumeRes.data ?? []);
        setNetworks(networkRes.data ?? []);
        setEvents(eventRes.data ?? []);
      } catch (err) {
        console.error(err);
        setError('Error fetching Docker data');
      } finally {
        setLoading(false);
      }
    };

    fetchDockerData();
  }, []);

  const imageColumns = [
    {
      title: 'Tag(s)',
      dataIndex: 'tags',
      key: 'tags',
      render: tags => tags?.length ? tags.join(', ') : <Tag color="red">untagged</Tag>,
    },
    {
      title: 'Size (MB)',
      dataIndex: 'size',
      key: 'size',
      render: size => <Tag color="geekblue">{(size / (1024 * 1024)).toFixed(2)} MB</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created',
      key: 'created',
      render: created => new Date(created * 1000).toLocaleString(),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} style={{ margin: 24 }} />;
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5' }}>
      <Title level={2} style={{ marginBottom: 24 }}>🐳 System Overview</Title>

      {/* Docker Info Card */}
      <Card
        title={<><InfoCircleOutlined /> Info</>}
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}><Text strong>Server Version:</Text> {version?.Version}</Col>
          <Col xs={24} sm={12} md={8}><Text strong>Containers:</Text> {info?.Containers}</Col>
          <Col xs={24} sm={12} md={8}><Text strong>Images:</Text> {info?.Images}</Col>
          <Col xs={24} sm={12} md={8}><Text strong>OS:</Text> {info?.OperatingSystem}</Col>
          <Col xs={24} sm={12} md={8}><Text strong>Architecture:</Text> {info?.Architecture}</Col>
          <Col xs={24} sm={12} md={8}><Text strong>CPU Cores:</Text> <Tag color="green">{info?.NCPU}</Tag></Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong>Total Memory:</Text> <Tag color="purple">{(info?.MemTotal / (1024 ** 3)).toFixed(2)} GB</Tag>
          </Col>
        </Row>
      </Card>

      {/* Images Table */}
      <Divider orientation="left"><HddOutlined /> Images</Divider>
      {images.length === 0 ? (
        <Text>No images found.</Text>
      ) : (
        <Table
          columns={imageColumns}
          dataSource={images.map(img => ({ ...img, key: img.Id }))}
          pagination={{ pageSize: 5 }}
          bordered
          style={{ marginBottom: 40 }}
        />
      )}

      {/* Volumes */}
      <Divider orientation="left"><DatabaseOutlined /> Volumes</Divider>
      <Card bordered style={{ marginBottom: 40 }}>
        {volumes.length === 0 ? (
          <Text>No volumes found.</Text>
        ) : (
          <List
            bordered
            size="small"
            dataSource={volumes}
            renderItem={vol => <List.Item key={vol.Name}>{vol.Name}</List.Item>}
          />
        )}
      </Card>

      {/* Networks */}
      <Divider orientation="left"><ClusterOutlined /> Networks</Divider>
      <Card bordered style={{ marginBottom: 40 }}>
        {networks.length === 0 ? (
          <Text>No networks found.</Text>
        ) : (
          <List
            bordered
            size="small"
            dataSource={networks}
            renderItem={net => (
              <List.Item key={net.Id}>
                <strong>{net.Name}</strong> <Text type="secondary">({net.Driver})</Text>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Events */}
      <Divider orientation="left"><ThunderboltOutlined /> Recent Events (24h)</Divider>
      <Card bordered>
        {events.length === 0 ? (
          <Text>No events recorded.</Text>
        ) : (
          <List
            size="small"
            bordered
            dataSource={events.slice(-20).reverse()}
            renderItem={e => (
              <List.Item key={e.id || e.timeNano}>
                <span style={{ fontFamily: 'monospace' }}>
                  {new Date((e.timeNano ?? e.timestamp * 1000000) / 1e6).toLocaleString()} -{' '}
                  <Tag color="blue">{e.action}</Tag>
                </span>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default DockerOverview;

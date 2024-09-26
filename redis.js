import redis from 'redis';

export const client = redis.createClient({
    password: "edpho@idm",
    //password:"edpho@idm",
    socket: {
        host: '192.168.131.18',
        port: '6379'
    }
});

client.on('error', (err) => {
  console.info(`Redis connection error: ${err}`);
  });

client.on('connect', () => { 
  console.info(`Connected to Redis server`); 
});

client.on('ready', () => {
  console.info(`Redis server ready`);
});

client.on('reconnecting', () => {
  console.info(`ReConnecting to Redis server`);
});

client.on('end', () => {
  console.info(`Redis server Disconnect`);
});

client.connect()

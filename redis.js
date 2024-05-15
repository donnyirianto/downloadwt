import redis from 'redis';

export const client = redis.createClient({
    password: "KSZ5FV1NhAtjii4AhzXZn6E5Tyx3pzsVyMZre07puNsOZijg7VoEZWhgzvfetWehZCGdeYCTvfCqTcRk",
    //password:"edpho@idm",
    socket: {
        host: '192.168.131.71',
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
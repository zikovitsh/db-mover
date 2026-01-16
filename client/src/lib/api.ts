import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxy handles the rest
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

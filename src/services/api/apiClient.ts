import axios from 'axios';
import Config from 'react-native-config';

const api = axios.create({
  baseURL: Config.API_URL || 'https://example.com/api',
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

// Configure centralized axios instance representing secure fintech standards
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor — Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    return response.data; // Ensure smooth access to payload
  },
  (error) => {
    const errorPayload = {
      message: 'Unknown error occurred',
      status: 500,
      data: null,
    };

    if (error.response) {
      errorPayload.status = error.response.status;
      errorPayload.message = error.response.data?.error || error.response.data?.message || 'Server Error';
      errorPayload.data = error.response.data;
    } else if (error.request) {
      errorPayload.message = 'No response received from server. Is the backend running?';
    } else {
      errorPayload.message = error.message;
    }

    console.error('API Error:', errorPayload);
    // Returning rejected promise to let the UI handle components loading states & toasts properly
    return Promise.reject(errorPayload);
  }
);

export default api;

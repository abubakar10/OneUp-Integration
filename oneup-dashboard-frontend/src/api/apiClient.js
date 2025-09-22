import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5216/api",
});

export default apiClient;
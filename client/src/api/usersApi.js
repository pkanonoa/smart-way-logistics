import api from './authApi';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data.users;
};

export const createUser = async (data) => {
  const response = await api.post('/users', data);
  return response.data.user;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

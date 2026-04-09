import api from "./api";

export const getUsuarios = async () => {
  const res = await api.get("/usuarios");
  return res.data;
};

export const crearUsuario = async (data) => {
  const res = await api.post("/usuarios", data);
  return res.data;
};

export const editarUsuario = async (id_usuario, data) => {
  const res = await api.post(`/usuarios/${id_usuario}`, data);
  return res.data;
};

export const activarUsuario = async (id_usuario) => {
  const res = await api.post(`/usuarios/${id_usuario}/activar`);
  return res.data;
};

export const desactivarUsuario = async (id_usuario) => {
  const res = await api.post(`/usuarios/${id_usuario}/desactivar`);
  return res.data;
};

export const asignarRolUsuario = async (id_usuario, id_rol) => {
  const res = await api.post(`/usuarios/${id_usuario}/roles`, { id_rol });
  return res.data;
};

export const quitarRolUsuario = async (id_usuario, id_rol) => {
  const res = await api.patch(`/usuarios/${id_usuario}/roles/${id_rol}/desactivar`);
  return res.data;
};

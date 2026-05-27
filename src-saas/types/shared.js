/**
 * Re-exports de tipos JSDoc inferidos desde los schemas zod compartidos.
 * Uso (desde cualquier .js/.jsx):
 *
 *   /** @typedef {import("../types/shared").VentaCreate} VentaCreate *\/
 *   /** @param {VentaCreate} payload *\/
 *   const submit = async (payload) => { ... }
 *
 * VSCode/TS-server entiende los tipos automaticamente y da autocompletado +
 * deteccion de errores cuando jsconfig.json tiene checkJs:true.
 */

// Re-export como JSDoc typedefs. Este archivo no exporta valores en runtime;
// solo sirve como portador de tipos para el editor.

/**
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/ventas").ventaCreateSchema>} VentaCreate
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/ventas").ventaReversionSchema>} VentaReversion
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/ventas").ventaItemSchema>} VentaItem
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/caja").cajaAperturaSchema>} CajaApertura
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/caja").cajaMovimientoSchema>} CajaMovimiento
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/caja").cajaCierreSchema>} CajaCierre
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/caja").validarPendienteSchema>} ValidarPendiente
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/productos").productoCreateSchema>} ProductoCreate
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/productos").productoUpdateSchema>} ProductoUpdate
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/productos").ajusteStockSchema>} AjusteStock
 * @typedef {import("zod").z.infer<typeof import("@pos-saas/shared-schemas/productos").tipoVehiculoSchema>} TipoVehiculo
 */

// Tipos de respuesta del backend (no estan en el schema zod, los definimos
// aqui como contratos manuales documentados).

/**
 * @typedef {Object} SessionUser
 * @property {number} id_usuario
 * @property {number} id_empresa
 * @property {string} username
 * @property {string} [email]
 * @property {string} nombre
 * @property {string} apellido
 * @property {string} rol
 * @property {Array<{id_rol: number, codigo: string}>} roles
 *
 * @typedef {Object} SessionEmpresa
 * @property {number} id_empresa
 * @property {string} slug
 * @property {string} nombre_legal
 *
 * @typedef {Object} SessionSucursal
 * @property {number} id_sucursal
 * @property {string} codigo
 * @property {string} nombre
 *
 * @typedef {Object} Session
 * @property {string} token
 * @property {SessionUser} user
 * @property {SessionEmpresa} empresa
 * @property {SessionSucursal} sucursal_activa
 * @property {SessionSucursal[]} sucursales
 * @property {string[]} modulos
 * @property {string[]} permisos
 *
 * @typedef {Object} VentaResponse
 * @property {Object} venta
 * @property {Object[]} detalles
 * @property {Object[]} reversiones
 *
 * @typedef {Object} ApiResponse
 * @property {boolean} ok
 * @property {*} [data]
 * @property {string} [error]
 * @property {Object} [details]
 */

export {};

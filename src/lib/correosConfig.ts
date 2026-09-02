export type ShippingServiceType = 
  | 'paq_ligero' 
  | 'estandar_domicilio' 
  | 'estandar_oficina' 
  | 'estandar_citypaq' 
  | 'premium_domicilio' 
  | 'premium_oficina'
  | 'today_domicilio';

export const CORREOS_CONFIG = {
  // Datos del Contrato y Cliente
  contractNumber: "54099640",
  clientNumber: "9981628805",
  labellerCode: "DH4T",
  clientId: "cc524d7f312f422eb0abe4ef288cccea",

  // Catálogo completo de Productos y Modalidades
  products: {
    paq_ligero: {
      code: "PAGXC",
      deliveryMethod: "BUUAOF",
      description: "Paq Ligero (Buzón)",
      maxWeightGrams: 2000
    },
    estandar_domicilio: {
      code: "PAFXB",
      deliveryMethod: "DOUAOF",
      description: "Paq Estándar Domicilio",
      maxWeightGrams: 40000
    },
    estandar_oficina: {
      code: "PAFXB",
      deliveryMethod: "OFUAOF",
      description: "Paq Estándar Entrega en Oficina",
      maxWeightGrams: 40000
    },
    estandar_citypaq: {
      code: "PAFXB",
      deliveryMethod: "CIUAOF",
      description: "Paq Estándar Citypaq",
      maxWeightGrams: 40000
    },
    premium_domicilio: {
      code: "PADXA",
      deliveryMethod: "DOUAOF",
      description: "Paq Premium Domicilio",
      maxWeightGrams: 40000
    },
    premium_oficina: {
      code: "PADXA",
      deliveryMethod: "OFUAOF",
      description: "Paq Premium Entrega en Oficina",
      maxWeightGrams: 40000
    },
    today_domicilio: {
      code: "PAAZF",
      deliveryMethod: "DOUAOF",
      description: "Paq Today Domicilio",
      maxWeightGrams: 5000
    }
  },

  // Valores por defecto
  defaultService: 'estandar_domicilio' as ShippingServiceType,

  endpoints: {
    token: "https://apis.correos.es/token/v1",
    preregister: "https://apis.correos.es/preregister/v1/shipments"
  }
};

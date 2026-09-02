import { CORREOS_CONFIG, ShippingServiceType } from './correosConfig';

export interface ShipmentAddress {
  name: string;
  street: string;
  city: string;
  zipCode: string;
  province: string;
  phone: string;
  email: string;
}

export interface ParcelDetails {
  weightGrams: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
}

export async function createCorreosShipment(
  recipient: ShipmentAddress,
  parcel: ParcelDetails,
  serviceType: ShippingServiceType = CORREOS_CONFIG.defaultService
) {
  const selectedService = CORREOS_CONFIG.products[serviceType] || CORREOS_CONFIG.products.estandar_domicilio;

  const shipmentPayload = {
    contractNumber: CORREOS_CONFIG.contractNumber,
    clientNumber: CORREOS_CONFIG.clientNumber,
    labellerCode: CORREOS_CONFIG.labellerCode,
    product: selectedService.code,
    deliveryMethod: selectedService.deliveryMethod,
    
    sender: {
      name: "HoloCards Canarias",
      street: "CTRA Monte Las Mercedes N127",
      city: "La Laguna",
      zipCode: "38293",
      province: "Santa Cruz de Tenerife",
      phone: "626119815",
      email: "soporte@holocardscanarias.com"
    },
    
    recipient: {
      name: recipient.name,
      street: recipient.street,
      city: recipient.city,
      zipCode: recipient.zipCode,
      province: recipient.province,
      phone: recipient.phone,
      email: recipient.email
    },
    
    parcel: {
      weight: parcel.weightGrams,
      height: parcel.heightCm || 10,
      width: parcel.widthCm || 15,
      length: parcel.lengthCm || 20
    }
  };

  try {
    const response = await fetch(CORREOS_CONFIG.endpoints.preregister, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": CORREOS_CONFIG.clientId
      },
      body: JSON.stringify(shipmentPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error Correos API (${response.status}): ${JSON.stringify(data)}`);
    }

    return {
      success: true,
      shipmentCode: data.shipmentCode || data.code,
      labelUrl: data.labelUrl,
      rawResponse: data
    };
  } catch (error: any) {
    console.error("Fallo al generar envío en Correos:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

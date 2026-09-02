"use client"

import React, { useState, useEffect } from "react"
import { 
  X, 
  Printer, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Package 
} from "lucide-react"
import { supabase } from "../../lib/supabase"

interface OrderData {
  id: string
  customer_name?: string
  customer_email?: string
  email?: string
  phone?: string
  address_street?: string
  address_city?: string
  address_zip?: string
  address_province?: string
  shipping_address?: any
  shipping_label_qr?: string
  tracking_number?: string
}

interface CorreosLabelModalProps {
  order: OrderData | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CorreosLabelModal({ order, isOpen, onClose, onSuccess }: CorreosLabelModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(order?.shipping_label_qr || null)
  const [shipmentCode, setShipmentCode] = useState<string | null>(order?.tracking_number || null)

  useEffect(() => {
    if (order) {
      setQrCodeBase64(order.shipping_label_qr || null)
      setShipmentCode(order.tracking_number || null)
      setError(null)
    }
  }, [order])

  if (!isOpen || !order) return null

  const getAddressObj = () => {
    let raw = order.shipping_address
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw) } catch { raw = {} }
    }
    return {
      name: order.customer_name || raw?.name || "Cliente HoloCards",
      street: order.address_street || raw?.street || raw?.address || "CTRA Monte Las Mercedes N127",
      city: order.address_city || raw?.city || "San Cristóbal de La Laguna",
      zip: order.address_zip || raw?.zip || raw?.zipCode || "38293",
      province: order.address_province || raw?.province || "Santa Cruz de Tenerife",
      phone: order.phone || raw?.phone || "626119815",
      email: order.customer_email || order.email || raw?.email || "soporte@holocardscanarias.com"
    }
  }

  const addr = getAddressObj()

  const handleGenerateLabel = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!supabase) throw new Error("Cliente de Supabase no inicializado")

      const { data, error: funcError } = await supabase.functions.invoke('create-correos-shipment', {
        body: {
          order_id: order.id,
          nombre: addr.name,
          direccion: addr.street,
          cp: addr.zip,
          ciudad: addr.city,
          provincia: addr.province,
          telefono: addr.phone,
          email: addr.email
        }
      })

      if (funcError) throw new Error(funcError.message)

      const qrReceived = data?.qrCode || data?.shipments?.[0]?.qrCode
      const trackingReceived = data?.shipmentCode || data?.shipments?.[0]?.shipmentCode || data?.fileIdentifier

      if (!qrReceived) {
        const errorDetail = data?.shipments?.[0]?.error?.[0]?.description || "Correos no devolvió un QR válido"
        throw new Error(errorDetail)
      }

      setQrCodeBase64(qrReceived)
      if (trackingReceived) setShipmentCode(trackingReceived)

      await supabase
        .from('orders')
        .update({
          shipping_label_qr: qrReceived,
          tracking_number: trackingReceived || 'CORREOS-PREREGISTER',
          status: 'shipped'
        })
        .eq('id', order.id)

      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error("Error al generar la etiqueta:", err)
      setError(err.message || "Fallo en la comunicación con Correos API")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!qrCodeBase64) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta Correos - ${order.id.slice(0, 8)}</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              background: #fff;
              color: #000;
            }
            .label-box {
              border: 3px solid #000;
              border-radius: 12px;
              padding: 20px;
              width: 340px;
              box-sizing: border-box;
            }
            .header-banner {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .brand-main { font-weight: 900; font-size: 22px; letter-spacing: 1px; }
            .service-tag { background: #000; color: #fff; padding: 2px 6px; font-size: 10px; font-weight: bold; }
            .section { border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 8px; text-align: left; }
            .section-title { font-size: 9px; font-weight: bold; color: #555; text-transform: uppercase; margin: 0 0 2px 0; }
            .sender-title { font-size: 14px; font-weight: 900; margin: 0 0 2px 0; }
            p { margin: 2px 0; font-size: 11px; font-weight: 600; }
            .qr-container { text-align: center; margin: 15px 0; }
            .qr-image { width: 180px; height: 180px; }
            .tracking-box { 
              border: 2px solid #000; 
              padding: 6px; 
              text-align: center; 
              font-weight: 900; 
              font-size: 14px; 
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="header-banner">
              <span class="brand-main">HOLOCARDS</span>
              <span class="service-tag">CORREOS</span>
            </div>

            <div class="section">
              <p class="section-title">REMITENTE</p>
              <p class="sender-title">HOLOCARDS</p>
              <p>CTRA. MONTE LAS MERCEDES 127</p>
              <p>38293 SAN CRISTÓBAL DE LA LAGUNA</p>
              <p>SANTA CRUZ DE TENERIFE, ESPAÑA</p>
            </div>

            <div class="section">
              <p class="section-title">DESTINATARIO</p>
              <p><strong>${addr.name.toUpperCase()}</strong></p>
              <p>${addr.street.toUpperCase()}</p>
              <p>${addr.zip} ${addr.city.toUpperCase()}</p>
              <p>${addr.province.toUpperCase()}</p>
              <p>TEL: ${addr.phone}</p>
            </div>

            <div class="qr-container">
              <img class="qr-image" src="data:image/svg+xml;base64,${qrCodeBase64}" alt="QR Correos" />
            </div>

            ${shipmentCode ? `<div class="tracking-box">Nº SEGUIMIENTO: ${shipmentCode}</div>` : ''}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a1628] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-5">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Etiqueta de Envío Correos</h3>
              <p className="text-xs text-gray-400 font-mono">Pedido #{order.id.slice(0, 8)}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#030c1a] border border-white/5 rounded-2xl p-3.5 text-xs flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">Datos de Entrega</span>
          <p className="text-white font-bold">{addr.name}</p>
          <p className="text-gray-300">{addr.street}</p>
          <p className="text-gray-400">{addr.zip} - {addr.city} ({addr.province})</p>
          <p className="text-gray-400">Teléfono: {addr.phone}</p>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#030c1a] border border-white/5 rounded-2xl p-6 min-h-[260px] text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Generando prerregistro en Correos API...
              </p>
            </div>
          ) : qrCodeBase64 ? (
            <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-yellow-400">
                <img 
                  src={`data:image/svg+xml;base64,${qrCodeBase64}`} 
                  alt="Código QR Prerregistro Correos" 
                  className="w-48 h-48 object-contain"
                />
              </div>

              {shipmentCode && (
                <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-lg">
                  Código Envío: {shipmentCode}
                </span>
              )}

              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4" /> Prerregistro registrado en Correos
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Package className="w-12 h-12 text-gray-600 stroke-[1.5]" />
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Genera el código QR oficial de Correos para este pedido directamente desde la API Connect.
              </p>
              <button
                onClick={handleGenerateLabel}
                className="mt-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(250,204,21,0.2)]"
              >
                <QrCode className="w-4 h-4" /> Generar Etiqueta Correos
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 leading-tight">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {qrCodeBase64 && (
            <button
              onClick={handlePrint}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Imprimir QR / Etiqueta
            </button>
          )}

          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}

export default CorreosLabelModal
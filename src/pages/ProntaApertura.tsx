/**
 * ProntaApertura — Landing "Próximamente"
 * Usa <picture> con media queries para servir la imagen correcta según dispositivo:
 *  - Móvil (< 768px)  → landing_teléfonos.png  (formato portrait optimizado)
 *  - Desktop (≥ 768px) → landing.png            (formato landscape panorámico)
 * El navegador solo descarga la imagen que corresponde → carga más rápida.
 * Para seguir desarrollando la tienda: /dev-store (ruta secreta)
 */
export default function ProntaApertura() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <picture style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Móvil portrait: < 768px → imagen vertical optimizada para teléfonos */}
        <source
          media="(max-width: 767px)"
          srcSet="/Imagenes/landing-movil.png"
        />
        {/* Tablet y Desktop: ≥ 768px → imagen panorámica completa */}
        <source
          media="(min-width: 768px)"
          srcSet="/Imagenes/landing.png"
        />
        {/* Fallback: usa la imagen de desktop por defecto */}
        <img
          src="/Imagenes/landing.png"
          alt="HoloCards — Próximamente abrimos nuestra tienda de TCG online"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center center',
            display: 'block',
          }}
        />
      </picture>
    </div>
  );
}

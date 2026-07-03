/**
 * ProntaApertura — Landing "Próximamente"
 * 100% Responsive — sin recortes en ningún dispositivo.
 * La imagen mantiene su proporción original a ancho completo.
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
      <img
        src="/Imagenes/landing.png"
        alt="HoloCards — Próximamente abrimos nuestra tienda de TCG online"
        style={{
          /* 
            Ancho máximo = toda la pantalla.
            Altura automática = respeta el ratio original → NUNCA se recorta.
            En móvil portrait: imagen a ancho completo, barras negras arriba/abajo.
            En desktop landscape: imagen ocupa toda la pantalla.
          */
          width: '100%',
          height: 'auto',
          maxHeight: '100vh',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}

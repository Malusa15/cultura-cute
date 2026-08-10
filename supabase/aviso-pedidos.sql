-- ============================================================================
-- Cultura.Cute — aviso por mail cuando entra un pedido
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase, DESPUÉS de
-- ventas.sql. Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- QUÉ RESUELVE
--
-- Un pedido del carrito entra a la base y ahí se queda: hasta ahora había que
-- abrir el panel para enterarse. Con esto, apenas se registra, la tienda le
-- avisa a una función de servidor (api/aviso-pedido.js) que arma el mail.
--
-- Esa función necesita leer el pedido para poder contarlo, y no puede: las
-- ventas están cerradas a quien no tiene sesión, que es justamente lo que
-- queremos. Esta función es la puerta angosta que le da acceso a un solo
-- pedido, y solo si es reciente.
-- ============================================================================

create or replace function resumen_de_venta(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resumen jsonb;
begin
  if p_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'numero',           v.numero,
    'cliente_nombre',   v.cliente_nombre,
    'cliente_contacto', v.cliente_contacto,
    'total',            v.total,
    'creada_en',        v.creada_en,
    'items', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'nombre',          i.nombre,
                 'talle',           i.talle,
                 'cantidad',        i.cantidad,
                 'precio_unitario', i.precio_unitario
               )
               order by i.nombre
             )
      from venta_items i
      where i.venta_id = v.id
    ), '[]'::jsonb)
  )
  into v_resumen
  from ventas v
  where v.id = p_id
    -- El candado: solo pedidos de los últimos quince minutos. Sin esto,
    -- cualquiera que consiguiera el id de una venta podría pedir el nombre y el
    -- teléfono de esa clienta para siempre. Con esto, la única ventana es la de
    -- un pedido que se acaba de hacer, y el id de ese pedido solo lo conoce el
    -- navegador de quien lo hizo.
    and v.creada_en > now() - interval '15 minutes';

  return v_resumen;
end;
$$;

revoke all on function resumen_de_venta(uuid) from public;
grant execute on function resumen_de_venta(uuid) to anon, authenticated;

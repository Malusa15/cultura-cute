-- ============================================================================
-- Cultura.Cute — pedidos a medida desde la tienda
--
-- Deja que el formulario de «Prendas a pedido» de la home cree un presupuesto
-- en borrador, para no tener que cargarlo a mano en el panel.
--
-- Se corre una sola vez, desde el SQL Editor del panel de Supabase, DESPUÉS de
-- presupuestos.sql. Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- De dónde salió el presupuesto
--
-- 'panel' es el que cargás vos; 'web' entró solo por el formulario y todavía le
-- faltan los materiales y las horas. Sirve para distinguirlos de un vistazo en
-- la lista.
-- ----------------------------------------------------------------------------

alter table presupuestos
  add column if not exists origen text not null default 'panel'
    check (origen in ('panel', 'web'));

-- ----------------------------------------------------------------------------
-- Alta desde la tienda
--
-- Mismo criterio que `registrar_pedido` (ver ventas.sql): la tienda no tiene
-- sesión, entra como `anon`, y en vez de darle INSERT sobre la tabla —que le
-- dejaría inventar totales, marcar presupuestos como aceptados o escribir
-- precios— se le da acceso solo a esta función.
--
-- Todo lo que es plata se fuerza en cero acá adentro: el precio lo pone Malena
-- después, en el panel. Del navegador solo se acepta texto.
-- ----------------------------------------------------------------------------

create or replace function registrar_pedido_a_medida(
  p_cliente_nombre   text,
  p_cliente_contacto text,
  p_prenda           text,
  p_descripcion      text,
  p_talle            text,
  p_fecha_entrega    date
)
returns table (id uuid, numero bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre  text := btrim(coalesce(p_cliente_nombre, ''));
  v_prenda  text := btrim(coalesce(p_prenda, ''));
  v_id      uuid;
  v_numero  bigint;
begin
  if v_nombre = '' then
    raise exception 'Falta el nombre de la clienta';
  end if;

  if v_prenda = '' then
    raise exception 'Falta decir qué prenda es';
  end if;

  -- Topes defensivos: sin esto, `anon` podría mandar textos de megabytes.
  -- Se recorta en vez de rechazar así un mensaje largo no pierde el pedido.
  insert into presupuestos (
    origen, estado, cliente_nombre, cliente_contacto, prenda, descripcion, talle,
    fecha_entrega, horas_trabajo, valor_hora, margen, descuento, total
  )
  values (
    'web',
    'borrador',
    left(v_nombre, 120),
    nullif(left(btrim(coalesce(p_cliente_contacto, '')), 120), ''),
    left(v_prenda, 200),
    nullif(left(btrim(coalesce(p_descripcion, '')), 2000), ''),
    nullif(left(btrim(coalesce(p_talle, '')), 40), ''),
    -- Una fecha de entrega en el pasado es un formulario mal completado.
    case when p_fecha_entrega >= current_date then p_fecha_entrega end,
    0, 0, 0, 0, 0
  )
  returning presupuestos.id, presupuestos.numero into v_id, v_numero;

  return query select v_id, v_numero;
end;
$$;

revoke all on function registrar_pedido_a_medida(text, text, text, text, text, date) from public;
grant execute on function registrar_pedido_a_medida(text, text, text, text, text, date)
  to anon, authenticated;

-- Las políticas de presupuestos.sql siguen igual: `anon` no puede LEER ningún
-- presupuesto, ni el que acaba de crear. Solo puede llamar a esta función, que
-- corre por afuera de las políticas y devuelve nada más que el número.

// Bandera simple (fuera de React) para distinguir, dentro de RequireAuth, un logout
// explícito de "llegaste aquí sin sesión". No se puede resolver con el orden de
// navigate()/logout() ni con flushSync: cuando el usuario se vuelve null, RequireAuth
// vuelve a renderizar de todos modos y siempre gana la última redirección — así que en
// vez de pelear con el timing, marcamos la intención antes y la leemos al renderizar.
//
// IMPORTANTE: la lectura (`peekLoggingOut`) debe ser pura — nada de mutar la bandera
// ahí. React StrictMode invoca el cuerpo de cada componente dos veces en desarrollo
// para detectar justo este tipo de efecto secundario en render; si la lectura resetea
// la bandera, la primera invocación la consume y la segunda (la que realmente se
// confirma) ya la ve en false. El reset va aparte, en un useEffect.
let loggingOut = false;

export function markLoggingOut() {
  loggingOut = true;
}

export function peekLoggingOut() {
  return loggingOut;
}

export function resetLoggingOutFlag() {
  loggingOut = false;
}

/** Para buscar sin importar mayúsculas ni tildes ("tesoreria" encuentra "Tesorería"). */
export function sinTildes(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

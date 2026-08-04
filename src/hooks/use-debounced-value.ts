import { useEffect, useState } from "react";

/**
 * Retorna o valor apenas após `delay` ms sem novas mudanças.
 *
 * Motivação (race condition + rede): usar o texto de busca diretamente na
 * `queryKey` dispara uma requisição por tecla digitada. Além do desperdício de
 * banda, respostas fora de ordem podem "piscar" resultados antigos. O debounce
 * colapsa a rajada em uma única chamada (~1 req a cada 300ms de pausa).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

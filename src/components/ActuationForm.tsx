import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'
import type { Category } from '../services/providerApi'

/**
 * Categorias e cidades de atuação do prestador: define quais pedidos aparecem como "compatíveis".
 * Os botões de enviar ficam com quem usa (rodapé do modal), ligados pelo atributo `form`.
 */
export function ActuationForm({ id, categories, initialIds, initialCities, disabled, error, onSubmit }: {
  id: string
  categories: Category[]
  initialIds: string[]
  initialCities: string[]
  disabled: boolean
  error?: string
  onSubmit: (input: { categoryIds: string[]; cities: string[] }) => void
}) {
  const [ids, setIds] = useState<string[]>(initialIds)
  const [cities, setCities] = useState<string[]>(initialCities)
  const [cityText, setCityText] = useState('')
  const [problem, setProblem] = useState('')

  const toggle = (categoryId: string) =>
    setIds((current) => current.includes(categoryId) ? current.filter((item) => item !== categoryId) : [...current, categoryId])

  function addCity() {
    const city = cityText.trim().replace(/\s+/g, ' ')
    if (!city) return false
    if (city.length < 2) { setProblem('Informe o nome completo da cidade.'); return false }
    const key = city.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const exists = cities.some((item) => item.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === key)
    if (!exists) setCities((current) => [...current, city])
    setCityText('')
    setProblem('')
    return true
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Cidade digitada e ainda não adicionada entra junto, para ninguém perder o que escreveu.
    const pending = cityText.trim().replace(/\s+/g, ' ')
    const all = pending && !cities.some((item) => item.toLowerCase() === pending.toLowerCase()) ? [...cities, pending] : cities
    if (!ids.length) { setProblem('Escolha ao menos uma categoria.'); return }
    if (!all.length) { setProblem('Informe ao menos uma cidade.'); return }
    setProblem('')
    onSubmit({ categoryIds: ids, cities: all })
  }

  const message = problem || error
  return (
    <form id={id} className="form-stack" onSubmit={submit} noValidate>
      <fieldset disabled={disabled} className="account-fields">
        <legend>Categorias em que você atua</legend>
        <div className="check-grid">
          {categories.map((category) => (
            <label key={category.id} className="check-option">
              <input type="checkbox" checked={ids.includes(category.id)} onChange={() => toggle(category.id)} />
              <span>{category.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={disabled} className="account-fields">
        <legend>Cidades que você atende</legend>
        <div className="city-input">
          <label htmlFor={`${id}-city`} className="sr-only">Cidade</label>
          <input id={`${id}-city`} value={cityText} maxLength={80} placeholder="Ex.: Fortaleza" autoComplete="address-level2"
            onChange={(event) => { setCityText(event.target.value); setProblem('') }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCity() } }} />
          <button type="button" className="button button-secondary" onClick={addCity}>Adicionar</button>
        </div>
        {cities.length > 0 && (
          <ul className="chip-list" aria-label="Cidades escolhidas">
            {cities.map((city) => (
              <li key={city} className="chip">
                {city}
                <button type="button" aria-label={`Remover ${city}`} onClick={() => setCities((current) => current.filter((item) => item !== city))}>
                  <Icon name="close" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <small>Um pedido é compatível quando a categoria e a cidade dele batem com as suas.</small>
      </fieldset>
      {message && <p role="alert" className="form-error">{message}</p>}
    </form>
  )
}

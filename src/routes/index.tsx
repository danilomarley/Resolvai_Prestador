import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Login } from '../pages/Login'
import { Cadastro } from '../pages/Cadastro'
import { NotFound } from '../pages/NotFound'
import { PrivateLayout } from '../components/PrivateLayout'
import { Home } from '../pages/Home'
import { Feed } from '../pages/Feed'
import { OrderPage } from '../pages/Order'
import { Proposals } from '../pages/Proposals'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/" element={<PrivateLayout />}>
          <Route index element={<Home />} />
          <Route path="pedidos" element={<Feed />} />
          <Route path="pedidos/:orderId" element={<OrderPage />} />
          <Route path="propostas" element={<Proposals />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

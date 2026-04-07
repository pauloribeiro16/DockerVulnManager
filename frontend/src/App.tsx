import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import OverviewPage from './pages/Overview'
import VulnerabilitiesPage from './pages/Vulnerabilities'
import ImagesPage from './pages/Images'
import ImageDetailPage from './pages/ImageDetail'
import HistoryPage from './pages/History'
import HardeningPage from './pages/Hardening'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/images/:name/:tag" element={<ImageDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/hardening" element={<HardeningPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

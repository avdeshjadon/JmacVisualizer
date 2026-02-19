import React, { useState, useEffect, useRef, useCallback } from 'react'
import LoadingOverlay from './components/LoadingOverlay'
import Header from './components/Header'
import StorageOverview from './components/StorageOverview'
import ChartContainer from './components/ChartContainer'
import Sidebar from './components/Sidebar'
import Tooltip from './components/Tooltip'
import DeleteModal from './components/DeleteModal'
import ToastContainer, { showToast } from './components/ToastContainer'
import Footer from './components/Footer'
import { fetchScan, fetchRoots, deleteItem } from './utils/api'
import { formatSize } from './utils/helpers'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Initializing…')
  const [roots, setRoots] = useState([])
  const [chartData, setChartData] = useState(null)
  const [currentRoot, setCurrentRoot] = useState(null)
  const [breadcrumbParts, setBreadcrumbParts] = useState([{ name: '~', path: '' }])

  // Center info state
  const [centerName, setCenterName] = useState('Home')
  const [centerSize, setCenterSize] = useState('—')
  const [centerItems, setCenterItems] = useState('Click to explore')

  // Sidebar state
  const [hoveredNode, setHoveredNode] = useState(null)
  const [rootNode, setRootNode] = useState(null)

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ visible: false, path: '', size: '' })
  const pendingDeleteRef = useRef({ path: null, size: 0 })

  // Tooltip ref
  const tooltipRef = useRef(null)

  // Resize timer
  const resizeTimerRef = useRef(null)
  const currentPathRef = useRef(null)

  // Load initial data
  useEffect(() => {
    init()
  }, [])

  // Handle resize
  useEffect(() => {
    function handleResize() {
      clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(() => {
        if (currentPathRef.current) {
          loadAndRender(currentPathRef.current, 3, false)
        }
      }, 300)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle Escape key for modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeDeleteModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function init() {
    setLoading(true)
    setLoadingText('Initializing…')
    try {
      const rootsList = await fetchRoots()
      setRoots(rootsList)
      await loadAndRender(undefined, 3, false)
    } catch (err) {
      console.error('Init failed:', err)
      setLoadingText('Error: ' + err.message)
    }
  }

  async function loadAndRender(path, depth = 3, pushHistory = true) {
    setLoading(true)
    setLoadingText(`Scanning ${path || 'home'}…`)
    try {
      const data = await fetchScan(path, depth)
      if (pushHistory && currentPathRef.current) {
        setNavigationHistory(prev => [...prev, currentPathRef.current])
      }
      currentPathRef.current = data.path
      setChartData(data)
      updateBreadcrumb(data.path)
      updateCenterInfoFromData(data)
    } catch (err) {
      console.error('Scan failed:', err)
      setLoadingText('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateCenterInfoFromData(data) {
    setCenterName(data.name)
    setCenterSize(formatSize(data.size || 0))
    setCenterItems(data.children ? `${data.children.length} items` : 'Click to explore')
  }

  function updateBreadcrumb(path) {
    const parts = path.split('/').filter(Boolean)
    let accum = ''
    const result = parts.map((part) => {
      accum += '/' + part
      return { name: part, path: accum }
    })
    setBreadcrumbParts(result.length > 0 ? result : [{ name: '~', path: '' }])
  }

  function handleRefresh() {
    if (currentPathRef.current) {
      loadAndRender(currentPathRef.current, 3, false)
    } else {
      init()
    }
  }

  function handleHoverNode(d, root, resetCenter = false) {
    if (d && d.data) {
      setHoveredNode(d)
      setRootNode(root)
      if (!resetCenter) {
        setCenterName(d.data.name)
        setCenterSize(formatSize(d.value))
        setCenterItems(d.children ? `${d.children.length} items` : undefined)
      } else {
        // Mouseleave: keep sidebar, reset center to root
        setCenterName(root.data.name)
        setCenterSize(formatSize(root.value))
        setCenterItems(root.children ? `${root.children.length} items` : '0 items')
      }
    } else if (root) {
      setCenterName(root.data.name)
      setCenterSize(formatSize(root.value))
      setCenterItems(root.children ? `${root.children.length} items` : '0 items')
    }
  }

  function handleClickDirectory(path) {
    loadAndRender(path)
  }

  function handleBreadcrumbClick(path) {
    if (path) loadAndRender(path)
  }

  function handleRootChange(path) {
    loadAndRender(path)
  }

  function promptDelete(path, size) {
    pendingDeleteRef.current = { path, size }
    setDeleteModal({ visible: true, path, size: formatSize(size) })
  }

  async function confirmDelete() {
    const { path } = pendingDeleteRef.current
    if (!path) return

    closeDeleteModal()
    showToast('Deleting…', 'info', 2000)

    try {
      const result = await deleteItem(path)
      if (result.success) {
        showToast(result.message, 'success')
        if (currentPathRef.current) {
          await loadAndRender(currentPathRef.current, 3, false)
        }
      } else {
        showToast(result.error || 'Delete failed', 'error')
      }
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error')
    }
  }

  function closeDeleteModal() {
    setDeleteModal({ visible: false, path: '', size: '' })
    pendingDeleteRef.current = { path: null, size: 0 }
  }

  return (
    <>
      <LoadingOverlay visible={loading} statusText={loadingText} />

      <Header
        breadcrumbParts={breadcrumbParts}
        roots={roots}
        onBreadcrumbClick={handleBreadcrumbClick}
        onRootChange={handleRootChange}
        onRefresh={handleRefresh}
      />

      <StorageOverview />

      <main className="main-content">
        <ChartContainer
          data={chartData}
          centerName={centerName}
          centerSize={centerSize}
          centerItems={centerItems || 'Click to explore'}
          tooltipRef={tooltipRef}
          onHoverNode={handleHoverNode}
          onClickDirectory={handleClickDirectory}
          onGoBack={handleRefresh}
        />

        <Sidebar
          hoveredNode={hoveredNode}
          rootNode={rootNode}
          onDelete={promptDelete}
          onNavigate={handleClickDirectory}
        />
      </main>

      <Footer />

      <Tooltip tooltipRef={tooltipRef} />

      <DeleteModal
        visible={deleteModal.visible}
        path={deleteModal.path}
        size={deleteModal.size}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />

      <ToastContainer />
    </>
  )
}

// ----------------------------------------------------------------------------
// Jmac Visualizer -- macOS Disk Usage Analyzer and Storage Manager
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
// If this project helped you, consider starring the repository, opening a
// pull request, or reporting issues on GitHub. Contributions are welcome.
// ----------------------------------------------------------------------------
//
// App.jsx -- Root Application Component
// ========================================
// Top-level React component that owns all application state and orchestrates
// the major UI regions: Header, StorageOverview, ChartContainer, Sidebar,
// Footer, DeleteModal, Tooltip, ToastContainer, and PermissionsOverlay.
//
// Responsibilities:
//   - Permission check on mount; shows PermissionsOverlay if denied.
//   - Fetches the list of filesystem roots for the root-selector dropdown.
//   - Drives all scan requests via loadAndRender(), which also manages a
//     frontend scan cache (keyed by "path_depth") with a background
//     pre-fetcher that warms subdirectory caches after each top-level scan.
//   - Propagates hover and click events from the SunburstChart up to
//     Sidebar (hovered node details) and the Breadcrumb (path display).
//   - Hosts the delete flow: promptDelete -> DeleteModal -> confirmDelete,
//     which calls the /api/delete endpoint and refreshes affected caches.
// ----------------------------------------------------------------------------
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
import PermissionsOverlay from './components/PermissionsOverlay'
import { fetchScan, fetchRoots, deleteItem, checkPermissions, requestPermissions, subscribeToEvents } from './utils/api'
import { formatSize } from './utils/helpers'

export default function App() {
  const [hasPermission, setHasPermission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Initializing…')
  const [roots, setRoots] = useState([])
  const [chartData, setChartData] = useState(null)
  const [currentRoot, setCurrentRoot] = useState(null)
  const [breadcrumbParts, setBreadcrumbParts] = useState([{ name: 'Users', path: '/Users' }])
  const [scanCache, setScanCache] = useState({}) // Cache for scan results

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

  // SSE: listen for filesystem change events (e.g. deletes) pushed by the backend
  useEffect(() => {
    const unsub = subscribeToEvents((event) => {
      if (event.type === 'deleted') {
        // Clear entire cache from frontend to ensure fresh ancestor sizes recalculate
        setScanCache({})
        // Re-scan the current view so the chart updates
        if (currentPathRef.current) {
          loadAndRender(currentPathRef.current, 3, false, true, false)
        }
        // Refresh disk overview bar
        window.dispatchEvent(new CustomEvent('refresh-disk'))
      }
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function init() {
    setLoading(true)
    setLoadingText('Checking permissions…')

    // Detect whether we are running inside an Electron shell.
    // In a plain browser window there is no window.process, so we skip
    // the Full Disk Access check and proceed directly.
    const inElectron =
      typeof window !== 'undefined' &&
      window.process &&
      window.process.type === 'renderer'

    try {
      if (inElectron) {
        const permRes = await checkPermissions()
        if (!permRes.fullDiskAccess) {
          setHasPermission(false)
          setLoading(false)
          return
        }
      }
      setHasPermission(true)

      setLoadingText('Initializing…')
      const rootsList = await fetchRoots()
      setRoots(rootsList)
      await loadAndRender(undefined, 3, false)
    } catch (err) {
      console.error('Init failed:', err)
      setLoadingText('Error: ' + err.message)
    }
  }

  async function handleCheckRecheck() {
    setLoading(true)
    setLoadingText('Checking permissions…')
    try {
      const permRes = await checkPermissions()
      if (permRes.fullDiskAccess) {
        setHasPermission(true)
        init()
      } else {
        showToast('Full Disk Access is still required.', 'error')
        setLoading(false)
      }
    } catch (err) {
      showToast('Check failed: ' + err.message, 'error')
      setLoading(false)
    }
  }

  async function handleRequestPermissions() {
    try {
      await requestPermissions()
    } catch (err) {
      showToast('Could not open settings automatically. Please open System Settings.', 'error')
    }
  }

  async function loadAndRender(path, depth = 3, pushHistory = true, isRefresh = false, showOverlay = true) {
    // Check cache first if not a refresh
    const cacheKey = `${path || 'home'}_${depth}`
    if (!isRefresh && scanCache[cacheKey]) {
      const data = scanCache[cacheKey]
      currentPathRef.current = data.path
      setChartData(data)
      updateBreadcrumb(data.path)
      updateCenterInfoFromData(data)
      if (showOverlay) setLoading(false)
      
      // Trigger background pre-fetch even on cache hit
      backgroundPreFetch(data)
      return
    }

    if (showOverlay) {
      setLoading(true)
      setLoadingText(`Scanning ${path || 'home'}…`)
    }
    try {
      const data = await fetchScan(path, depth)
      currentPathRef.current = data.path
      setChartData(data)
      updateBreadcrumb(data.path)
      updateCenterInfoFromData(data)
      
      // Update cache
      setScanCache(prev => ({ ...prev, [cacheKey]: data }))
      
      // Trigger background pre-fetch
      backgroundPreFetch(data)
    } catch (err) {
      console.error('Scan failed:', err)
      if (showOverlay) setLoadingText('Error: ' + err.message)
    } finally {
      if (showOverlay) setLoading(false)
    }
  }

  /**
   * Background pre-fetcher: fetches next level for immediate children
   */
  async function backgroundPreFetch(data) {
    if (!data || !data.children) return
    
    // Extract directories that aren't cached yet
    const dirsToFetch = data.children
      .filter(item => item.type === 'directory' && item.path)
      .filter(item => !scanCache[`${item.path}_3`])
      .slice(0, 5) // Limit concurrent background fetches

    for (const dir of dirsToFetch) {
      // Small delay to let UI breathe
      await new Promise(r => setTimeout(r, 500))
      
      const cacheKey = `${dir.path}_3`
      if (scanCache[cacheKey]) continue

      try {
        console.log(`[Background] Pre-fetching ${dir.name}...`)
        const subData = await fetchScan(dir.path, 3)
        setScanCache(prev => ({ ...prev, [cacheKey]: subData }))
      } catch (err) {
        console.warn(`[Background] Failed to pre-fetch ${dir.path}:`, err)
      }
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
    console.log('Performing hard refresh...')
    setScanCache({}) // Clear all scan results
    window.dispatchEvent(new CustomEvent('refresh-disk')) // Update Storage Bar
    
    if (currentPathRef.current) {
      loadAndRender(currentPathRef.current, 3, false, true)
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
        setCenterSize(formatSize(d.data.size || d.value))
        setCenterItems(d.children ? `${d.children.length} items` : undefined)
      } else {
        // Mouseleave: keep sidebar, reset center to root
        setCenterName(root.data.name)
        setCenterSize(formatSize(root.data.size || root.value))
        setCenterItems(root.children ? `${root.children.length} items` : '0 items')
      }
    } else if (root) {
      setCenterName(root.data.name)
      setCenterSize(formatSize(root.data.size || root.value))
      setCenterItems(root.children ? `${root.children.length} items` : '0 items')
    }
  }

  function handleClickDirectory(path) {
    loadAndRender(path)
  }

  function handleBreadcrumbClick(path) {
    if (path !== undefined) loadAndRender(path)
  }

  function handleGoBack() {
    if (!currentPathRef.current) return
    const path = currentPathRef.current
    if (path === '/' || path === '') return
    
    // Find parent path
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) return
    parts.pop()
    const parent = '/' + parts.join('/')
    loadAndRender(parent)
  }

  function handleRootChange(path) {
    loadAndRender(path)
  }

  function promptDelete(path, size) {
    pendingDeleteRef.current = { path, size }
    setDeleteModal({ visible: true, path, size: formatSize(size) })
  }

  async function confirmDelete(permanent = false) {
    const { path } = pendingDeleteRef.current
    if (!path) return

    closeDeleteModal()
    showToast(`${permanent ? 'Permanently deleting…' : 'Moving to Trash…'}`, 'info', 2000)

    try {
      const result = await deleteItem(path, permanent)
      if (result.success) {
        showToast(result.message, 'success')
        
        // Live update: Clear cache and re-scan
        setScanCache({})

        // Refresh disk overview bar
        window.dispatchEvent(new CustomEvent('refresh-disk'))

        if (currentPathRef.current) {
          await loadAndRender(currentPathRef.current, 3, false, true, false)
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

  if (hasPermission === false) {
    return (
      <>
        <Header
          breadcrumbParts={[{ name: 'Setup', path: '/' }]}
          roots={[]}
          onBreadcrumbClick={() => {}}
          onRootChange={() => {}}
          onRefresh={handleCheckRecheck}
        />
        <PermissionsOverlay onCheck={handleCheckRecheck} onRequest={handleRequestPermissions} />
        <ToastContainer />
      </>
    )
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

      <StorageOverview onNavigate={handleClickDirectory} />

      <main className="main-content">
        <ChartContainer
          data={chartData}
          centerName={centerName}
          centerSize={centerSize}
          centerItems={centerItems || 'Click to explore'}
          tooltipRef={tooltipRef}
          onHoverNode={handleHoverNode}
          onRootDelete={promptDelete}
          onClickDirectory={handleClickDirectory}
          onGoBack={handleGoBack}
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
        onConfirm={(perm) => confirmDelete(perm)}
        onCancel={closeDeleteModal}
      />

      <ToastContainer />
    </>
  )
}

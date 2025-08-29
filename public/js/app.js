document.addEventListener('DOMContentLoaded', function() {
  // 全局变量
  let sitesSearchInput = document.getElementById('site-search');
  let sites = [];
  let currentPage = 1;
  const sitesPerPage = 5;
  let responseTimeChart, availabilityChart;
  let timeRangeSelect = document.getElementById('time-range-select');
  
  // DOM元素
  const addSiteModal = document.getElementById('add-site-modal');
  const modalContent = document.getElementById('modal-content');
  const modalTitle = document.getElementById('modal-title');
  const submitSiteBtn = document.getElementById('submit-site');
  const closeModalBtn = document.getElementById('close-modal');
  const cancelAddBtn = document.getElementById('cancel-add');
  const siteForm = document.getElementById('site-form');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const currentPageBtn = document.getElementById('current-page');
  const addSiteButton = document.getElementById('add-site-btn');
  const mobileAddSiteBtn = document.getElementById('mobile-add-site-btn');
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const refreshDataBtn = document.getElementById('refresh-data');
  const intervalButtons = document.querySelectorAll('[data-interval]');

  // 初始化
  async function init() {
    // 加载网站数据
    await loadSites();
    
    // 初始化图表
    initCharts();
    
    // 渲染网站列表
    renderSitesTable();
    
    // 更新统计数据
    updateStatistics();
    
    // 开始定期检查
    startPeriodicChecks();
    
    // 绑定事件监听器
    bindEventListeners();
  }
  
  // 绑定事件监听器
  function bindEventListeners() {
    // 搜索框事件
    siteSearchInput.addEventListener('input', debounce(renderSitesTable, 300));
    
    // 模态框事件
    addSiteButton.addEventListener('click', openModal);
    mobileAddSiteBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelAddBtn.addEventListener('click', closeModal);
    siteForm.addEventListener('submit', handleFormSubmit);
    
    // 分页事件
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    
    // 移动端菜单
    mobileMenuButton.addEventListener('click', toggleMobileMenu);
    
    // 刷新数据
    refreshDataBtn.addEventListener('click', refreshAllSitesStatus);
    
    // 时间范围选择
    timeRangeSelect.addEventListener('change', updateCharts);
    
    // 图表时间间隔选择
    intervalButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        intervalButtons.forEach(b => b.classList.remove('bg-primary', 'text-white'));
        intervalButtons.forEach(b => b.classList.add('bg-gray-light', 'text-gray-600', 'hover:bg-gray-200'));
        this.classList.remove('bg-gray-light', 'text-gray-600', 'hover:bg-gray-200');
        this.classList.add('bg-primary', 'text-white');
        updateCharts();
      });
    });
  }
  
  // 加载网站数据
  async function loadSites() {
    try {
      // 尝试从API加载
      const response = await fetch('/api/sites');
      if (response.ok) {
        sites = await response.json();
        return;
      }
    } catch (error) {
      console.log('API加载失败，尝试从localStorage加载:', error);
    }
    
    // 从localStorage加载备份
    const saved = localStorage.getItem('monitoring_sites');
    sites = saved ? JSON.parse(saved) : [];
  }
  
  // 保存网站数据
  async function saveSites() {
    try {
      // 尝试保存到API
      await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sites)
      });
    } catch (error) {
      console.log('API保存失败，保存到localStorage:', error);
    }
    
    // 保存到localStorage备份
    localStorage.setItem('monitoring_sites', JSON.stringify(sites));
  }
  
  // 渲染网站表格
  function renderSitesTable() {
    const tableBody = document.getElementById('sites-table-body');
    const filteredSites = getFilteredSites();
    const totalPages = Math.ceil(filteredSites.length / sitesPerPage);
    
    // 确保当前页有效
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }
    
    // 计算分页范围
    const startIndex = (currentPage - 1) * sitesPerPage;
    const paginatedSites = filteredSites.slice(startIndex, startIndex + sitesPerPage);
    
    // 更新分页信息
    document.getElementById('pagination-info').textContent = 
      `显示 ${startIndex + 1} 到 ${Math.min(startIndex + sitesPerPage, filteredSites.length)}，共 ${filteredSites.length} 个网站`;
    currentPageBtn.textContent = currentPage;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // 处理空状态
    if (filteredSites.length === 0) {
      document.getElementById('pagination-container').classList.add('hidden');
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-10 text-center text-gray-500">
            <div class="flex flex-col items-center">
              <i class="fa fa-globe text-4xl mb-3 text-gray-300"></i>
              <p>尚未添加任何监测网站</p>
              <button class="mt-3 text-primary hover:underline" id="empty-state-add-btn">点击添加</button>
            </div>
          </td>
        </tr>
      `;
      // 重新绑定事件
      document.getElementById('empty-state-add-btn').addEventListener('click', openModal);
      return;
    } else {
      document.getElementById('pagination-container').classList.remove('hidden');
    }
    
    // 渲染表格内容
    tableBody.innerHTML = '';
    paginatedSites.forEach(site => {
      let statusBadge = '';
      let statusClass = '';
      
      if (site.status === 'online') {
        statusBadge = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
            <span class="w-2 h-2 rounded-full bg-success mr-1 pulse-animation"></span>
            在线
          </span>
        `;
        statusClass = 'text-gray-600';
      } else if (site.status === 'slow') {
        statusBadge = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
            <span class="w-2 h-2 rounded-full bg-warning mr-1 pulse-animation"></span>
            响应缓慢
          </span>
        `;
        statusClass = 'text-warning font-medium';
      } else {
        statusBadge = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-danger">
            <span class="w-2 h-2 rounded-full bg-danger mr-1"></span>
            离线
          </span>
        `;
        statusClass = 'text-gray-600';
      }
      
      const row = document.createElement('tr');
      row.className = 'border-t hover:bg-gray-50 transition-all-300';
      row.innerHTML = `
        <td class="px-6 py-4">
          <div class="flex items-center">
            <img src="https://picsum.photos/seed/${site.id}/40/40" alt="${site.name}图标" class="w-8 h-8 rounded mr-3">
            <span class="font-medium">${site.name}</span>
          </div>
        </td>
        <td class="px-6 py-4 text-gray-600 truncate max-w-xs">${site.url}</td>
        <td class="px-6 py-4">
          ${statusBadge}
        </td>
        <td class="px-6 py-4 ${statusClass}">${site.status === 'offline' ? '-' : `${site.responseTime}ms`}</td>
        <td class="px-6 py-4 text-gray-600">${site.lastChecked ? formatRelativeTime(new Date(site.lastChecked)) : '从未检查'}</td>
        <td class="px-6 py-4">
          <div class="flex space-x-2">
            <button class="text-primary hover:text-primary/80 transition-all-300 view-history" data-id="${site.id}" title="查看历史">
              <i class="fa fa-history"></i>
            </button>
            <button class="text-primary hover:text-primary/80 transition-all-300 edit-site" data-id="${site.id}" title="编辑">
              <i class="fa fa-edit"></i>
            </button>
            <button class="text-danger hover:text-danger/80 transition-all-300 delete-site" data-id="${site.id}" title="删除">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    // 添加事件监听器
    document.querySelectorAll('.edit-site').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const siteId = e.currentTarget.getAttribute('data-id');
        editSite(siteId);
      });
    });
    
    document.querySelectorAll('.delete-site').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const siteId = e.currentTarget.getAttribute('data-id');
        deleteSite(siteId);
      });
    });
    
    document.querySelectorAll('.view-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const siteId = e.currentTarget.getAttribute('data-id');
        viewSiteHistory(siteId);
      });
    });
  }
  
  // 获取过滤后的网站列表
  function getFilteredSites() {
    const searchTerm = siteSearchInput.value.toLowerCase();
    if (!searchTerm) return sites;
    
    return sites.filter(site => 
      site.name.toLowerCase().includes(searchTerm) || 
      site.url.toLowerCase().includes(searchTerm)
    );
  }
  
  // 编辑网站
  function editSite(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    // 填充表单
    document.getElementById('edit-site-id').value = site.id;
    document.getElementById('site-name').value = site.name;
    document.getElementById('site-url').value = site.url;
    document.getElementById('check-interval').value = site.interval;
    document.getElementById('response-threshold').value = site.responseThreshold || 500;
    
    // 通知设置
    if (site.notifications) {
      document.getElementById('notify-email').checked = site.notifications.email || false;
      document.getElementById('notify-sms').checked = site.notifications.sms || false;
      document.getElementById('notify-inapp').checked = site.notifications.inapp || false;
    } else {
      document.getElementById('notify-email').checked = true;
      document.getElementById('notify-sms').checked = false;
      document.getElementById('notify-inapp').checked = true;
    }
    
    // 更新模态框
    modalTitle.textContent = '编辑网站';
    submitSiteBtn.textContent = '更新网站';
    
    // 显示模态框
    openModal();
  }
  
  // 删除网站
  async function deleteSite(siteId) {
    if (!confirm('确定要删除这个监测网站吗？')) return;
    
    const initialLength = sites.length;
    sites = sites.filter(s => s.id !== siteId);
    
    if (sites.length !== initialLength) {
      await saveSites();
      showNotification('网站已从监测列表中删除', 'success');
      
      // 更新UI
      renderSitesTable();
      updateStatistics();
      updateCharts();
    }
  }
  
  // 查看网站历史
  function viewSiteHistory(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site || !site.history || site.history.length === 0) {
      showNotification('没有该网站的历史记录', 'info');
      return;
    }
    
    // 创建历史记录模态框
    const historyModal = document.createElement('div');
    historyModal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    historyModal.innerHTML = `
      <div class="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div class="p-6 border-b flex items-center justify-between">
          <h3 class="text-xl font-bold">${site.name} 的历史记录</h3>
          <button class="text-gray-500 hover:text-gray-700 close-history-modal">
            <i class="fa fa-times"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto flex-grow">
          <div class="space-y-3">
            ${site.history.slice(-20).reverse().map(record => {
              let statusClass = 'bg-success/10 text-success';
              let statusText = '在线';
              
              if (record.status === 'offline') {
                statusClass = 'bg-danger/10 text-danger';
                statusText = '离线';
              } else if (record.status === 'slow') {
                statusClass = 'bg-warning/10 text-warning';
                statusText = '响应缓慢';
              }
              
              return `
                <div class="p-3 rounded-lg border ${statusClass}">
                  <div class="flex justify-between items-center">
                    <span class="font-medium">${statusText}</span>
                    <span class="text-sm">${new Date(record.timestamp).toLocaleString()}</span>
                  </div>
                  <div class="mt-1 text-sm">
                    响应时间: ${record.responseTime || '-'}ms
                    ${record.statusCode ? `, 状态码: ${record.statusCode}` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(historyModal);
    
    // 添加关闭事件
    historyModal.querySelector('.close-history-modal').addEventListener('click', () => {
      historyModal.remove();
    });
  }
  
  // 处理表单提交
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    const siteId = document.getElementById('edit-site-id').value;
    const name = document.getElementById('site-name').value;
    const url = document.getElementById('site-url').value;
    const interval = parseInt(document.getElementById('check-interval').value);
    const responseThreshold = parseInt(document.getElementById('response-threshold').value);
    
    // 验证URL格式
    try {
      new URL(url);
    } catch (error) {
      showNotification('请输入有效的URL（需包含http://或https://）', 'error');
      return;
    }
    
    if (siteId) {
      // 更新现有网站
      const index = sites.findIndex(s => s.id === siteId);
      if (index !== -1) {
        sites[index] = {
          ...sites[index],
          name,
          url,
          interval,
          responseThreshold,
          notifications: {
            email: document.getElementById('notify-email').checked,
            sms: document.getElementById('notify-sms').checked,
            inapp: document.getElementById('notify-inapp').checked
          }
        };
        
        await saveSites();
        showNotification('网站信息已更新', 'success');
      }
    } else {
      // 添加新网站
      const newSite = {
        id: generateId(),
        name,
        url,
        interval,
        responseThreshold,
        status: 'unknown',
        lastChecked: null,
        responseTime: null,
        history: [],
        notifications: {
          email: document.getElementById('notify-email').checked,
          sms: document.getElementById('notify-sms').checked,
          inapp: document.getElementById('notify-inapp').checked
        }
      };
      
      sites.push(newSite);
      await saveSites();
      showNotification('新网站已添加到监测列表', 'success');
      
      // 立即检查新添加的网站
      checkSiteStatus(newSite.id);
    }
    
    // 关闭模态框并更新UI
    closeModal();
    renderSitesTable();
    updateStatistics();
    updateCharts();
  }
  
  // 检查单个网站状态
  async function checkSiteStatus(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    try {
      // 显示加载状态
      renderSitesTable();
      
      // 调用API检查网站状态
      const response = await fetch(`/api/check-site?url=${encodeURIComponent(site.url)}`);
      const result = await response.json();
      
      // 处理结果
      let status = 'online';
      if (!result.success) {
        status = 'offline';
      } else if (result.responseTime > (site.responseThreshold || 500)) {
        status = 'slow';
      }
      
      // 更新网站信息
      const previousStatus = site.status;
      site.status = status;
      site.responseTime = result.responseTime;
      site.lastChecked = new Date().toISOString();
      
      // 保存历史记录
      if (!site.history) site.history = [];
      site.history.push({
        timestamp: site.lastChecked,
        status,
        responseTime: result.responseTime,
        statusCode: result.statusCode
      });
      
      // 限制历史记录数量
      if (site.history.length > 100) {
        site.history = site.history.slice(-100);
      }
      
      // 保存更新
      await saveSites();
      
      // 检查是否需要发送通知
      if (previousStatus && previousStatus !== status && (status === 'offline' || status === 'slow')) {
        sendNotificationForSite(site, status, previousStatus);
      }
      
      // 更新UI
      renderSitesTable();
      updateStatistics();
      updateCharts();
      
      return result;
    } catch (error) {
      console.error(`Error checking site ${siteId}:`, error);
      // 更新为离线状态
      site.status = 'offline';
      site.lastChecked = new Date().toISOString();
      
      await saveSites();
      renderSitesTable();
      updateStatistics();
      return { success: false, error: error.message };
    }
  }
  
  // 刷新所有网站状态
  async function refreshAllSitesStatus() {
    // 显示加载状态
    refreshDataBtn.innerHTML = '<i class="fa fa-spinner fa-spin text-gray-600"></i>';
    refreshDataBtn.disabled = true;
    
    try {
      for (const site of sites) {
        await checkSiteStatus(site.id);
        // 避免请求过于密集
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      showNotification('所有网站状态已更新', 'success');
    } catch (error) {
      console.error('刷新网站状态失败:', error);
      showNotification('刷新网站状态失败', 'error');
    } finally {
      // 恢复按钮状态
      refreshDataBtn.innerHTML = '<i class="fa fa-refresh text-gray-600"></i>';
      refreshDataBtn.disabled = false;
    }
  }
  
  // 开始定期检查
  function startPeriodicChecks() {
    // 立即检查一次
    refreshAllSitesStatus();
    
    // 设置定时器，每分钟检查一次需要检查的网站
    setInterval(() => {
      const now = new Date().getTime();
      
      sites.forEach(site => {
        // 检查是否需要进行定期检查
        const lastChecked = site.lastChecked ? new Date(site.lastChecked).getTime() : 0;
        const intervalMs = (site.interval || 300) * 1000; // 转换为毫秒
        
        if (now - lastChecked >= intervalMs) {
          checkSiteStatus(site.id);
        }
      });
    }, 60000); // 每分钟检查一次是否需要执行监测
  }
  
  // 发送网站通知
  function sendNotificationForSite(site, currentStatus, previousStatus) {
    // 检查通知设置
    if (!site.notifications || (!site.notifications.email && !site.notifications.sms && !site.notifications.inapp)) {
      return;
    }
    
    let message = '';
    let type = '';
    
    if (currentStatus === 'offline') {
      message = `网站 "${site.name}" 已离线`;
      type = 'error';
    } else if (currentStatus === 'slow') {
      message = `网站 "${site.name}" 响应缓慢 (${site.responseTime}ms)`;
      type = 'warning';
    }
    
    // 显示应用内通知
    if (site.notifications.inapp) {
      showNotification(message, type);
    }
    
    // 在实际应用中，这里会发送邮件和短信通知
    console.log(`发送通知: ${message}`, site.notifications);
  }
  
  // 显示通知
  function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    let bgColor = 'bg-blue-50 border-blue-200';
    let textColor = 'text-blue-800';
    let icon = 'fa-info-circle';
    
    if (type === 'success') {
      bgColor = 'bg-green-50 border-green-200';
      textColor = 'text-green-800';
      icon = 'fa-check-circle';
    } else if (type === 'error') {
      bgColor = 'bg-red-50 border-red-200';
      textColor = 'text-red-800';
      icon = 'fa-exclamation-circle';
    } else if (type === 'warning') {
      bgColor = 'bg-yellow-50 border-yellow-200';
      textColor = 'text-yellow-800';
      icon = 'fa-exclamation-triangle';
    }
    
    notification.className = `border rounded-lg p-4 mb-3 ${bgColor} ${textColor} shadow-sm transform transition-all duration-300 translate-x-full opacity-0`;
    notification.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <i class="fa ${icon}"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm">${message}</p>
        </div>
        <button class="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600">
          <i class="fa fa-times"></i>
        </button>
      </div>
    `;
    
    container.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
    
    // 关闭按钮事件
    notification.querySelector('button').addEventListener('click', () => {
      removeNotification(notification);
    });
    
    // 自动关闭
    const timeout = type === 'error' ? 10000 : 5000;
    setTimeout(() => {
      removeNotification(notification);
    }, timeout);
  }
  
  // 移除通知
  function removeNotification(notification) {
    notification.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
  
  // 更新统计数据
  function updateStatistics() {
    const total = sites.length;
    const online = sites.filter(s => s.status === 'online').length;
    const offline = sites.filter(s => s.status === 'offline').length;
    const slow = sites.filter(s => s.status === 'slow').length;
    
    // 计算平均响应时间
    let totalResponseTime = 0;
    let respondingSites = 0;
    
    sites.forEach(site => {
      if (site.status !== 'offline' && site.responseTime) {
        totalResponseTime += site.responseTime;
        respondingSites++;
      }
    });
    
    const avgResponseTime = respondingSites > 0 ? Math.round(totalResponseTime / respondingSites) : 0;
    const availabilityRate = total > 0 ? Math.round((online / total) * 100) : 0;
    
    // 更新UI
    document.getElementById('total-sites').textContent = total;
    document.getElementById('online-sites').textContent = online;
    document.getElementById('offline-sites').textContent = offline;
    document.getElementById('avg-response-time').textContent = `${avgResponseTime}ms`;
    document.getElementById('online-percentage').textContent = `${availabilityRate}% 可用性`;
    
    // 更新可用性图表数据
    document.getElementById('availability-online').textContent = `${availabilityRate}%`;
    document.getElementById('availability-offline').textContent = `${total > 0 ? Math.round((offline / total) * 100) : 0}%`;
    document.getElementById('availability-slow').textContent = `${total > 0 ? Math.round((slow / total) * 100) : 0}%`;
    
    // 更新通知徽章
    const notificationCount = offline + slow;
    const badge = document.getElementById('notification-badge');
    if (notificationCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  
  // 初始化图表
  function initCharts() {
    // 响应时间趋势图
    const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
    responseTimeChart = new Chart(responseTimeCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#666',
            borderColor: 'rgba(22, 93, 255, 0.2)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 4,
            boxPadding: 4
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '响应时间 (ms)'
            }
          }
        }
      }
    });
    
    // 可用性饼图
    const availabilityCtx = document.getElementById('availabilityChart').getContext('2d');
    availabilityChart = new Chart(availabilityCtx, {
      type: 'doughnut',
      data: {
        labels: ['在线', '离线', '响应缓慢'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [
            '#00B42A',
            '#F53F3F',
            '#FF7D00'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    
    // 更新图表数据
    updateCharts();
  }
  
  // 更新图表数据
  function updateCharts() {
    const timeRange = timeRangeSelect.value || '24h';
    const interval = document.querySelector('[data-interval].bg-primary')?.dataset.interval || 'hourly';
    
    // 更新可用性图表
    const total = sites.length;
    const online = sites.filter(s => s.status === 'online').length;
    const offline = sites.filter(s => s.status === 'offline').length;
    const slow = sites.filter(s => s.status === 'slow').length;
    
    availabilityChart.data.datasets[0].data = [online, offline, slow];
    availabilityChart.update();
    
    // 更新响应时间趋势图
    // 为每个网站准备数据系列
    const datasets = [];
    const labels = getTimeLabels(timeRange, interval);
    
    sites.forEach((site, index) => {
      // 生成随机颜色
      const color = getRandomColor(index);
      
      // 生成模拟数据（实际应用中应该使用真实的历史数据）
      const data = generateMockResponseTimes(labels.length, site.responseTime || 300);
      
      datasets.push({
        label: site.name,
        data: data,
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        tension: 0.4,
        fill: false
      });
    });
    
    responseTimeChart.data.labels = labels;
    responseTimeChart.data.datasets = datasets;
    responseTimeChart.update();
  }
  
  // 分页控制
  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      renderSitesTable();
    }
  }
  
  function goToNextPage() {
    const filteredSites = getFilteredSites();
    const totalPages = Math.ceil(filteredSites.length / sitesPerPage);
    
    if (currentPage < totalPages) {
      currentPage++;
      renderSitesTable();
    }
  }
  
  // 模态框控制
  function openModal() {
    addSiteModal.classList.remove('hidden');
    addSiteModal.classList.add('flex');
    setTimeout(() => {
      modalContent.classList.remove('scale-95', 'opacity-0');
      modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
  }
  
  function closeModal() {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      addSiteModal.classList.remove('flex');
      addSiteModal.classList.add('hidden');
      siteForm.reset();
      document.getElementById('edit-site-id').value = '';
      modalTitle.textContent = '添加新网站';
      submitSiteBtn.textContent = '添加网站';
    }, 300);
  }
  
  // 移动端菜单控制
  function toggleMobileMenu() {
    mobileMenu.classList.toggle('hidden');
  }
  
  // 生成时间标签
  function getTimeLabels(timeRange, interval) {
    const labels = [];
    const now = new Date();
    let hours = 24;
    
    if (timeRange === '7d') {
      hours = 24 * 7;
    } else if (timeRange === '30d') {
      hours = 24 * 30;
    }
    
    let step = 1;
    if (interval === 'daily' && timeRange !== '24h') {
      step = 24;
    } else if (interval === 'weekly' && timeRange === '30d') {
      step = 24 * 7;
    }
    
    for (let i = hours; i >= 0; i -= step) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      if (interval === 'hourly' || timeRange === '24h') {
        labels.push(time.getHours() + ':00');
      } else if (interval === 'daily') {
        labels.push(time.getMonth() + 1 + '/' + time.getDate());
      } else {
        labels.push('第' + Math.ceil((i / 24 / 7) + 1) + '周');
      }
    }
    
    return labels;
  }
  
  // 生成模拟响应时间数据
  function generateMockResponseTimes(count, baseTime) {
    return Array.from({ length: count }, () => {
      // 在基准时间上下浮动30%
      const variation = Math.random() * 0.6 - 0.3; // -0.3 到 0.3 之间
      return Math.round(baseTime * (1 + variation));
    });
  }
  
  // 生成随机颜色
  function getRandomColor(index) {
    // 使用固定的种子生成一致的颜色
    const colors = [
      '#165DFF', '#36CFC9', '#52C41A', '#FAAD14', '#FF4D4F',
      '#722ED1', '#EB0AA4', '#F5222D', '#FA8C16', '#FAAD14'
    ];
    return colors[index % colors.length];
  }
  
  // 工具函数：生成唯一ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  // 工具函数：格式化相对时间
  function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}秒前`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}天前`;
  }
  
  // 工具函数：防抖
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // 启动应用
  init();
});

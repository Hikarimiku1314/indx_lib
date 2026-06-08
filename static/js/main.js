// 当前页面
let currentPage = 'dashboard';

// 显示页面
function showPage(page, event) {
    // 更新菜单激活状态
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event) {
        event.target.closest('.menu-item').classList.add('active');
    }

    // 隐藏所有页面
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    // 显示当前页面
    document.getElementById('page-' + page).style.display = 'block';

    // 更新标题
    const titles = {
        'dashboard': '管理驾驶舱',
        'system': '指标体系',
        'center': '指标中心',
        'market': '指标市场',
        'bloodline': '指标血缘',
        'alert': '智能预警',
        'agent': '智能应用'
    };
    document.getElementById('page-title').textContent = titles[page];

    // 加载数据
    currentPage = page;
    if (page === 'system') loadSystemData();
    else if (page === 'center') loadCenterData();
    else if (page === 'market') loadMarketData();
    else if (page === 'bloodline') loadBloodline('all');
    else if (page === 'alert') loadAlertData();
}

// 加载指标体系数据
function loadSystemData() {
    // 加载北极星指标
    fetch('/api/north_star')
        .then(res => res.json())
        .then(data => {
            const grid = document.getElementById('north-star-grid');
            grid.innerHTML = data.map(metric => `
                <div class="north-star-card" style="cursor: pointer;" onclick="showMetricDetail('${metric.id}')">
                    <div class="north-star-name">${metric.name}</div>
                    <div class="north-star-value">${metric.value}${metric.unit}</div>
                    <div class="north-star-trend ${metric.trend >= 0 ? 'up' : 'down'}">
                        <i class="fas fa-arrow-${metric.trend >= 0 ? 'up' : 'down'}"></i>
                        ${Math.abs(metric.trend)}%
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: rgba(255,255,255,0.8);">
                        <i class="fas fa-chart-line"></i> 点击查看趋势
                    </div>
                </div>
            `).join('');
        });

    // 加载指标树
    fetch('/api/metric_tree')
        .then(res => res.json())
        .then(data => {
            const tree = document.getElementById('metric-tree');
            tree.innerHTML = data.children.map(node => renderTreeNode(node)).join('');
        });
}

// 渲染树节点
function renderTreeNode(node) {
    const hasChildren = node.children && node.children.length > 0;
    if (hasChildren) {
        return `
            <li class="tree-node">
                <div class="tree-node-header" onclick="toggleTreeNode(this)">
                    <i class="fas fa-chevron-right"></i>
                    <span class="tree-node-name">${node.name}</span>
                </div>
                <ul class="tree-children">
                    ${node.children.map(child => renderTreeNode(child)).join('')}
                </ul>
            </li>
        `;
    } else {
        return `
            <li class="tree-child-item" onclick="showMetricDetail('${node.id}')">
                <span class="tree-child-name">${node.name}</span>
                <span class="tree-child-value">${node.value}${node.unit || '%'}</span>
                ${node.trend !== undefined ? `
                    <span class="tree-child-trend ${node.trend >= 0 ? 'up' : 'down'}">
                        <i class="fas fa-arrow-${node.trend >= 0 ? 'up' : 'down'}"></i>
                        ${Math.abs(node.trend)}%
                    </span>
                ` : ''}
            </li>
        `;
    }
}

// 切换树节点展开/收起
function toggleTreeNode(el) {
    el.classList.toggle('expanded');
    el.nextElementSibling.classList.toggle('expanded');
}

// 显示指标详情
function showMetricDetail(metricId) {
    // 同时获取指标详情和质量数据
    Promise.all([
        fetch('/api/metric/' + metricId).then(res => res.json()),
        fetch('/api/quality/' + metricId).then(res => res.json())
    ]).then(([data, qualityData]) => {
        if (Object.keys(data).length > 0) {
            document.getElementById('detail-title').textContent = data.name;

            // 数据质量部分HTML
            let qualityHtml = '';
            if (qualityData && qualityData.name) {
                const statusClass = qualityData.status === 'normal' ? 'quality-normal' : 
                                   qualityData.status === 'warning' ? 'quality-warning' : 'quality-danger';
                const statusText = qualityData.status === 'normal' ? '正常' : 
                                   qualityData.status === 'warning' ? '警告' : '异常';
                
                qualityHtml = `
                    <div class="detail-section">
                        <h4 class="detail-section-title">
                            <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
                            数据质量
                        </h4>
                        <div class="quality-overview">
                            <div class="quality-score-container">
                                <div class="quality-score-circle ${statusClass}">
                                    <span class="quality-score-value">${qualityData.quality_score}</span>
                                    <span class="quality-score-label">分</span>
                                </div>
                                <span class="quality-status-tag ${statusClass}">${statusText}</span>
                            </div>
                            <div class="quality-metrics-grid">
                                <div class="quality-metric-item">
                                    <div class="quality-metric-label">完整性</div>
                                    <div class="quality-metric-bar">
                                        <div class="quality-metric-fill" style="width: ${qualityData.completeness}%"></div>
                                    </div>
                                    <div class="quality-metric-value">${qualityData.completeness}%</div>
                                </div>
                                <div class="quality-metric-item">
                                    <div class="quality-metric-label">一致性</div>
                                    <div class="quality-metric-bar">
                                        <div class="quality-metric-fill" style="width: ${qualityData.consistency}%"></div>
                                    </div>
                                    <div class="quality-metric-value">${qualityData.consistency}%</div>
                                </div>
                                <div class="quality-metric-item">
                                    <div class="quality-metric-label">及时性</div>
                                    <div class="quality-metric-bar">
                                        <div class="quality-metric-fill" style="width: ${qualityData.timeliness}%"></div>
                                    </div>
                                    <div class="quality-metric-value">${qualityData.timeliness}%</div>
                                </div>
                                <div class="quality-metric-item">
                                    <div class="quality-metric-label">准确性</div>
                                    <div class="quality-metric-bar">
                                        <div class="quality-metric-fill" style="width: ${qualityData.accuracy}%"></div>
                                    </div>
                                    <div class="quality-metric-value">${qualityData.accuracy}%</div>
                                </div>
                            </div>
                            <div class="quality-info">
                                <span>检查类型: ${qualityData.check_type}</span>
                                <span>异常数量: ${qualityData.anomaly_count}个</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            document.getElementById('detail-content').innerHTML = `
                <div class="detail-section">
                    <h4 class="detail-section-title">基本信息</h4>
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <div class="detail-info-label">指标ID</div>
                            <div class="detail-info-value">${data.id}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">指标类型</div>
                            <div class="detail-info-value">${data.type}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">状态</div>
                            <div class="detail-info-value"><span class="status-badge ${getStatusClass(data.status)}">${data.status}</span></div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">负责人</div>
                            <div class="detail-info-value">${data.owner}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">所属部门</div>
                            <div class="detail-info-value">${data.department}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">统计周期</div>
                            <div class="detail-info-value">${data.cycle}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">计量单位</div>
                            <div class="detail-info-value">${data.unit || '-'}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">数据源</div>
                            <div class="detail-info-value">${data.data_source || '-'}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">更新时间</div>
                            <div class="detail-info-value">${data.update_time || '-'}</div>
                        </div>
                    </div>
                </div>

                ${qualityHtml}

                <div class="detail-section">
                    <h4 class="detail-section-title">指标定义</h4>
                    <p style="color: #5a6c7d; line-height: 1.6;">${data.definition || '-'}</p>
                </div>

                <div class="detail-section">
                    <h4 class="detail-section-title">业务口径</h4>
                    <p style="color: #5a6c7d; line-height: 1.6;">${data.business_caliber}</p>
                </div>

                <div class="detail-section">
                    <h4 class="detail-section-title">技术字段</h4>
                    <code style="color: #6c757d; background: #f8f9fa; padding: 10px; border-radius: 6px; display: block; word-break: break-all;">${data.technical_field}</code>
                </div>

                <div class="detail-section">
                    <h4 class="detail-section-title">趋势数据</h4>
                    <div style="height: 280px; margin-top: 15px;">
                        <canvas id="metric-detail-chart"></canvas>
                    </div>
                </div>

                <div class="detail-section">
                    <h4 class="detail-section-title">数据血缘</h4>
                    <ul class="detail-bloodline-list">
                        ${(data.bloodline || []).map(item => `
                            <li class="detail-bloodline-item" style="cursor: pointer;" onclick="showDataPreview('${item}', '表')" title="点击查看数据">
                                <i class="fas fa-link"></i>
                                <span style="text-decoration: underline; text-decoration-style: dotted;">${item}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;

            document.getElementById('detail-modal').classList.add('show');

            // 渲染趋势图表
            fetch('/api/metric/trend/' + metricId)
                .then(res => res.json())
                .catch(() => {
                    return generateMockTrendData(metricId);
                })
                .then(trendData => {
                    const ctx = document.getElementById('metric-detail-chart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: trendData.data.map(d => d.date.slice(5)),
                            datasets: [{
                                label: data.name,
                                data: trendData.data.map(d => d.value),
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 5,
                                pointHoverRadius: 7,
                                pointBackgroundColor: '#667eea'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                x: { grid: { display: false } },
                                y: { grid: { color: '#edf2f7' } }
                            }
                        }
                    });
                });
            }
        });
}

// 获取状态样式类
function getStatusClass(status) {
    switch(status) {
        case '已发布': return 'status-published';
        case '审批中': return 'status-pending';
        case '已下线': return 'status-offline';
        case '已授权': return 'status-authorized';
        default: return '';
    }
}

// 生成模拟趋势数据
function generateMockTrendData(metricId) {
    const baseValues = {
        'mk001': 5.2,
        'mk002': 8.5,
        'mk003': 12.3,
        'mk004': 85,
        'mk005': 92,
        'mk006': 45.6,
        'mk007': 78,
        'mk008': 88,
        'm001': 15.2,
        'm002': 12.8,
        'm003': 25.5,
        'm004': 1.8,
        'm005': 320
    };
    const baseValue = baseValues[metricId] || 50;
    const data = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const variation = (Math.random() - 0.5) * baseValue * 0.2;
        data.push({
            date: date.toISOString().slice(0, 10),
            value: parseFloat((baseValue + variation).toFixed(2))
        });
    }

    return { metricId, data };
}

// 加载指标中心数据
function loadCenterData(category = 'all') {
    fetch('/api/metrics')
        .then(res => res.json())
        .then(data => {
            // 更新分类统计
            updateCategoryCounts(data);
            
            // 过滤数据
            const filteredData = filterByCategory(data, category);
            
            const tbody = document.querySelector('#metrics-table tbody');
            tbody.innerHTML = filteredData.map(metric => `
                <tr>
                    <td>${metric.name}</td>
                    <td>
                        <span class="status-tag ${getTypeClass(metric.type)}">${metric.type}</span>
                    </td>
                    <td>${metric.owner}</td>
                    <td>${metric.cycle}</td>
                    <td>
                        <span class="status-tag ${getStatusClass(metric.status)}">${metric.status}</span>
                    </td>
                    <td>
                        ${metric.status === '已发布' ? `
                            <button class="btn btn-warning btn-sm" onclick="toggleMetricStatus('${metric.id}')">下线</button>
                        ` : metric.status === '已下线' ? `
                            <button class="btn btn-success btn-sm" onclick="toggleMetricStatus('${metric.id}')">重新发布</button>
                        ` : ''}
                        <button class="btn btn-primary btn-sm" style="margin-left: 5px;" onclick="showMetricDetail('${metric.id}')">
                            <i class="fas fa-chart-line"></i> 详情
                        </button>
                    </td>
                </tr>
            `).join('');
            
            // 更新标题
            const categoryNames = {
                'all': '全部',
                'profit': '盈利能力',
                'risk': '风险指标',
                'growth': '发展能力',
                'efficiency': '经营效率',
                'capital': '资本充足',
                'liquidity': '流动性',
                'market': '市场表现'
            };
            document.getElementById('center-title').textContent = `${categoryNames[category] || '全部'}指标列表`;
            document.getElementById('filter-status-tag').textContent = `共 ${filteredData.length} 个指标`;
        });
}

// 分类映射
const categoryMapping = {
    'profit': ['净利润率', 'ROE', 'ROA', '毛利率', '净利率', '成本收入比', '资产收益率'],
    'risk': ['不良贷款率', '拨备覆盖率', '风险加权资产', '资本充足率', '核心一级资本充足率'],
    'growth': ['营业收入增长率', '净利润增长率', '总资产增长率', '净资产增长率', '客户增长率'],
    'efficiency': ['成本收入比', '运营效率指数', '人均产能', '资产周转率'],
    'capital': ['资本充足率', '核心一级资本充足率', '一级资本充足率', '净资产', '总资产'],
    'liquidity': ['流动性比率', '流动比率', '现金比率', '存贷比', '资金流动性指数'],
    'market': ['市场份额', '客户满意度', '品牌价值', '客户流失率']
};

// 更新分类统计
function updateCategoryCounts(metrics) {
    const counts = {
        'all': metrics.length,
        'profit': 0,
        'risk': 0,
        'growth': 0,
        'efficiency': 0,
        'capital': 0,
        'liquidity': 0,
        'market': 0
    };
    
    metrics.forEach(metric => {
        for (const [category, names] of Object.entries(categoryMapping)) {
            if (names.includes(metric.name)) {
                counts[category]++;
            }
        }
    });
    
    Object.entries(counts).forEach(([cat, count]) => {
        const el = document.getElementById(`cat-count-${cat}`);
        if (el) el.textContent = count;
    });
}

// 按分类过滤
function filterByCategory(metrics, category) {
    if (category === 'all') return metrics;
    
    const categoryNames = categoryMapping[category] || [];
    return metrics.filter(metric => categoryNames.includes(metric.name));
}

// 切换分类
function switchCategory(category, el) {
    // 更新选中状态
    document.querySelectorAll('.category-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    el.classList.add('active');
    
    // 加载对应分类的数据
    loadCenterData(category);
}

function getTypeClass(type) {
    const classes = {
        '原子': 'status-published',
        '派生': 'status-pending',
        '复合': 'status-offline'
    };
    return classes[type] || '';
}

// 切换指标状态
function toggleMetricStatus(metricId) {
    fetch('/api/toggle_status/' + metricId, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadCenterData();
            }
        });
}

// 显示新增指标弹窗
function showAddMetricModal() {
    document.getElementById('add-modal').classList.add('show');
}

// 保存指标
function saveMetric() {
    const data = {
        name: document.getElementById('add-name').value,
        type: document.getElementById('add-type').value,
        unit: document.getElementById('add-unit').value,
        business_caliber: document.getElementById('add-caliber').value,
        owner: document.getElementById('add-owner').value
    };

    fetch('/api/add_metric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            closeModal('add-modal');
            loadCenterData();
        }
    });
}

// 加载指标市场数据
let selectedMetrics = [];

function loadMarketData() {
    fetch('/api/market')
        .then(res => res.json())
        .then(data => {
            const grid = document.getElementById('market-grid');
            grid.innerHTML = data.map(metric => `
                <div class="market-card" draggable="true" ondragstart="dragMetric(event, '${metric.id}')">
                    <div class="market-card-header">
                        <div class="market-card-title">${metric.name}</div>
                        <div class="market-card-category">${metric.category}</div>
                    </div>
                    <div class="market-card-body">
                        <p>${metric.description}</p>
                    </div>
                    <div class="market-card-footer">
                        <span class="market-popularity">
                            <i class="fas fa-fire" style="color: #ff6b35;"></i>
                            ${metric.popularity}
                        </span>
                        <span class="status-badge ${metric.permission === '已授权' ? 'status-authorized' : 'status-pending'}">${metric.permission}</span>
                    </div>
                    <div class="market-card-time">
                        <div class="time-item">
                            <i class="fas fa-history"></i>
                            <span>${metric.update_time}</span>
                        </div>
                        <div class="time-item">
                            <i class="fas fa-clock"></i>
                            <span>${metric.next_update_time}</span>
                        </div>
                    </div>
                    <div class="market-card-actions">
                        <label class="market-card-checkbox">
                            <input type="checkbox" ${metric.permission === '已授权' ? '' : 'disabled'} onchange="toggleMetricSelection('${metric.id}', '${metric.name}', '${metric.category}', '${metric.unit || '-'}', '${metric.permission}')">
                            <span>选择</span>
                        </label>
                        <button class="btn btn-primary btn-sm" onclick="showMarketMetricDetail('${metric.id}')">
                            <i class="fas fa-info-circle"></i> 详情
                        </button>
                    </div>
                </div>
            `).join('');
        });
}

// 拖拽指标
function dragMetric(event, metricId) {
    event.dataTransfer.setData('metricId', metricId);
}

// 切换指标选择
function toggleMetricSelection(id, name, category, unit, permission) {
    const checkbox = event.target;
    if (checkbox.checked) {
        if (selectedMetrics.length >= 5) {
            checkbox.checked = false;
            alert('最多只能选择5个指标');
            return;
        }
        selectedMetrics.push({ id, name, category, unit, permission });
    } else {
        selectedMetrics = selectedMetrics.filter(m => m.id !== id);
    }
    updateSelectedMetricsPanel();
}

// 更新已选指标面板
function updateSelectedMetricsPanel() {
    const countDisplay = document.getElementById('selected-count-display');
    const listContainer = document.getElementById('selected-metrics-list');
    const openCompareBtn = document.getElementById('open-compare-btn');
    const comparisonPanel = document.getElementById('comparison-panel');

    countDisplay.textContent = `已选 ${selectedMetrics.length} 个指标（最多5个）`;
    openCompareBtn.disabled = selectedMetrics.length < 2;

    // 根据是否有选中指标调整面板宽度
    if (selectedMetrics.length > 0) {
        comparisonPanel.classList.add('has-selection');
    } else {
        comparisonPanel.classList.remove('has-selection');
    }

    if (selectedMetrics.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-selected-state">
                <i class="fas fa-hand-pointer"></i>
                <p>勾选或拖拽指标卡片<br>到此处添加对比</p>
            </div>
        `;
    } else {
        listContainer.innerHTML = selectedMetrics.map(m => `
            <div class="selected-metric-item">
                <div class="selected-metric-info">
                    <div class="selected-metric-name">${m.name}</div>
                    <div class="selected-metric-category">${m.category}</div>
                </div>
                <button class="selected-metric-remove" onclick="removeMetric('${m.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
}

// 移除指标
function removeMetric(id) {
    selectedMetrics = selectedMetrics.filter(m => m.id !== id);
    updateSelectedMetricsPanel();
    
    // 取消勾选对应的checkbox
    const checkbox = document.querySelector(`input[onchange*="${id}"]`);
    if (checkbox) checkbox.checked = false;
}

// 清空选择
function clearMetricSelection() {
    selectedMetrics = [];
    updateSelectedMetricsPanel();
    
    // 取消所有勾选
    document.querySelectorAll('.market-card-checkbox input').forEach(cb => {
        cb.checked = false;
    });
}

// 打开对比弹窗
function openComparisonPage() {
    if (selectedMetrics.length < 2) {
        alert('请至少选择2个指标进行对比');
        return;
    }

    // 获取所有选中指标的详细信息
    Promise.all(selectedMetrics.map(m => 
        fetch('/api/market').then(res => res.json()).then(data => {
            const metric = data.find(item => item.id === m.id);
            return metric;
        })
    )).then(metrics => {
        // 过滤出已授权的指标
        const authorizedMetrics = metrics.filter(m => m.permission === '已授权');
        
        if (authorizedMetrics.length < 2) {
            alert('对比功能仅限已授权指标参与，请至少选择2个已授权指标');
            return;
        }

        showComparisonModal(authorizedMetrics);
    });
}

// 显示市场指标详情
function showMarketMetricDetail(metricId) {
    // 先获取指标的基本信息
    fetch('/api/market')
        .then(res => res.json())
        .then(marketMetrics => {
            const metric = marketMetrics.find(m => m.id === metricId);
            if (metric) {
                // 如果有对应的metric_id且已授权，使用指标中心的详情
                if (metric.metric_id && metric.permission === '已授权') {
                    showMetricDetail(metric.metric_id);
                } else {
                    // 否则显示简化版详情（根据是否已授权决定是否显示趋势数据）
                    showMarketMetricDetailSimple(metric);
                }
            }
        });
}

// 显示市场指标简化版详情
function showMarketMetricDetailSimple(metric) {
    const modalContent = document.getElementById('detail-content');
    const modalTitle = document.getElementById('detail-title');
    const isAuthorized = metric.permission === '已授权';

    modalTitle.textContent = metric.name;

    let htmlContent = `
        <div class="detail-section">
            <h4 class="detail-section-title">基本信息</h4>
            <div class="detail-info-grid">
                <div class="detail-info-item">
                    <div class="detail-info-label">指标分类</div>
                    <div class="detail-info-value">${metric.category}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">热度</div>
                    <div class="detail-info-value"><i class="fas fa-fire" style="color: #ff6b35;"></i> ${metric.popularity}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">权限状态</div>
                    <div class="detail-info-value"><span class="status-badge ${isAuthorized ? 'status-authorized' : 'status-pending'}">${metric.permission}</span></div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">计量单位</div>
                    <div class="detail-info-value">${metric.unit || '-'}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">更新时间</div>
                    <div class="detail-info-value">${metric.update_time || '-'}</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-label">下次更新</div>
                    <div class="detail-info-value">${metric.next_update_time || '-'}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4 class="detail-section-title">指标描述</h4>
            <p style="color: #5a6c7d; line-height: 1.6;">${metric.description}</p>
        </div>
    `;

    // 只有已授权指标才显示趋势数据
    if (isAuthorized) {
        htmlContent += `
            <div class="detail-section">
                <h4 class="detail-section-title">趋势数据</h4>
                <div style="height: 250px; margin-top: 15px;">
                    <canvas id="metric-detail-chart"></canvas>
                </div>
            </div>
        `;
    } else {
        htmlContent += `
            <div class="detail-section">
                <div class="unauthorized-notice">
                    <i class="fas fa-lock"></i>
                    <span>该指标尚未授权，暂不支持查看趋势数据</span>
                </div>
            </div>
        `;
    }

    modalContent.innerHTML = htmlContent;

    document.getElementById('detail-modal').classList.add('show');

    // 只有已授权指标才获取并渲染趋势数据
    if (isAuthorized) {
        fetch('/api/metric/trend/' + metric.id)
            .then(res => res.json())
            .catch(() => {
                return generateMockTrendData(metric.id);
            })
            .then(trendData => {
                const ctx = document.getElementById('metric-detail-chart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: trendData.data.map(d => d.date.slice(5)),
                        datasets: [{
                            label: metric.name,
                            data: trendData.data.map(d => d.value),
                            borderColor: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: '#667eea'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            x: { grid: { display: false } },
                            y: { grid: { color: '#edf2f7' } }
                        }
                    }
                });
            });
    }
}

// 显示对比弹窗
function showComparisonModal(metrics) {
    const modalContent = document.getElementById('comparison-content');
    const modalTitle = document.getElementById('comparison-title');

    modalTitle.textContent = `指标对比 (${metrics.length}个指标)`;

    // 构建对比表格 - 包含单位信息
    const headers = ['指标名称', '分类', '单位', '热度', '权限状态'];
    
    modalContent.innerHTML = `
        <div class="comparison-container">
            <table class="comparison-table">
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${metrics.map(metric => `
                        <tr>
                            <td><strong>${metric.name}</strong></td>
                            <td>${metric.category}</td>
                            <td><span class="unit-tag">${metric.unit || '-'}</span></td>
                            <td><i class="fas fa-fire" style="color: #ff6b35;"></i> ${metric.popularity}</td>
                            <td><span class="status-badge ${metric.permission === '已授权' ? 'status-authorized' : 'status-pending'}">${metric.permission}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="comparison-chart-section">
                <h4 class="detail-section-title">趋势对比</h4>
                <div class="chart-legend-info">
                    ${getUnitGroupsInfo(metrics)}
                </div>
                <div style="height: 350px; margin-top: 15px;">
                    <canvas id="comparison-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    document.getElementById('comparison-modal').classList.add('show');

    // 根据单位分组
    const unitGroups = {};
    metrics.forEach((metric, index) => {
        const unit = metric.unit || '无单位';
        if (!unitGroups[unit]) {
            unitGroups[unit] = [];
        }
        unitGroups[unit].push({ metric, index });
    });

    const units = Object.keys(unitGroups);
    const hasMultipleUnits = units.length > 1;

    // 准备图表数据
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#fa709a'];
    
    const datasets = [];
    const yAxesConfig = {};

    let colorIndex = 0;
    units.forEach((unit, unitIdx) => {
        unitGroups[unit].forEach(({ metric, index }) => {
            datasets.push({
                label: `${metric.name} (${unit})`,
                data: Array(6).fill(0).map(() => Math.round((Math.random() * 50 + 50) * 10) / 10),
                borderColor: colors[colorIndex % colors.length],
                backgroundColor: colors[colorIndex % colors.length] + '20',
                fill: false,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: hasMultipleUnits ? (unitIdx === 0 ? 'y' : 'y1') : 'y'
            });
            colorIndex++;
        });
    });

    // 配置Y轴
    if (hasMultipleUnits) {
        yAxesConfig.y = {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
                display: true,
                text: units[0]
            },
            grid: {
                color: '#edf2f7'
            }
        };
        yAxesConfig.y1 = {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
                display: true,
                text: units[1] || '右轴'
            },
            grid: {
                drawOnChartArea: false
            }
        };
    } else {
        yAxesConfig.y = {
            display: true,
            title: {
                display: true,
                text: units[0] || '数值'
            },
            grid: {
                color: '#edf2f7'
            }
        };
    }

    const ctx = document.getElementById('comparison-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: { labels: ['1月', '2月', '3月', '4月', '5月', '6月'], datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: yAxesConfig
        }
    });
}

// 获取单位分组信息
function getUnitGroupsInfo(metrics) {
    const unitGroups = {};
    metrics.forEach(metric => {
        const unit = metric.unit || '无单位';
        if (!unitGroups[unit]) {
            unitGroups[unit] = [];
        }
        unitGroups[unit].push(metric.name);
    });

    const units = Object.keys(unitGroups);
    if (units.length <= 1) {
        return `<span class="unit-info">同一纵轴展示 (单位: ${units[0] || '无'})</span>`;
    }

    return units.map((unit, idx) => 
        `<span class="unit-info ${idx === 0 ? 'unit-left' : 'unit-right'}">${idx === 0 ? '左纵轴' : '右纵轴'}: ${unit} (${unitGroups[unit].join(', ')})</span>`
    ).join('<br>');
}

// 搜索市场
function searchMarket() {
    const keyword = document.getElementById('market-search').value;
    const category = document.getElementById('market-category').value;
    
    fetch('/api/market')
        .then(res => res.json())
        .then(data => {
            let filtered = data;
            
            if (keyword) {
                filtered = filtered.filter(m => m.name.includes(keyword) || m.description.includes(keyword));
            }
            
            if (category !== '全部') {
                filtered = filtered.filter(m => m.category === category);
            }
            
            const grid = document.getElementById('market-grid');
            grid.innerHTML = filtered.map(metric => `
                <div class="market-card" draggable="true" ondragstart="dragMetric(event, '${metric.id}')">
                    <div class="market-card-header">
                        <div class="market-card-title">${metric.name}</div>
                        <div class="market-card-category">${metric.category}</div>
                    </div>
                    <div class="market-card-body">
                        <p>${metric.description}</p>
                    </div>
                    <div class="market-card-footer">
                        <span class="market-popularity">
                            <i class="fas fa-fire" style="color: #ff6b35;"></i>
                            ${metric.popularity}
                        </span>
                        <span class="status-badge ${metric.permission === '已授权' ? 'status-authorized' : 'status-pending'}">${metric.permission}</span>
                    </div>
                    <div class="market-card-time">
                        <div class="time-item">
                            <i class="fas fa-history"></i>
                            <span>${metric.update_time}</span>
                        </div>
                        <div class="time-item">
                            <i class="fas fa-clock"></i>
                            <span>${metric.next_update_time}</span>
                        </div>
                    </div>
                    <div class="market-card-actions">
                        <label class="market-card-checkbox">
                            <input type="checkbox" ${metric.permission === '已授权' ? '' : 'disabled'} onchange="toggleMetricSelection('${metric.id}', '${metric.name}', '${metric.category}', '${metric.unit || '-'}', '${metric.permission}')">
                            <span>选择</span>
                        </label>
                        <button class="btn btn-primary btn-sm" onclick="showMarketMetricDetail('${metric.id}')">
                            <i class="fas fa-info-circle"></i> 详情
                        </button>
                    </div>
                </div>
            `).join('');
        });
}

// 加载血缘数据
function loadBloodline(metricId) {
    fetch('/api/bloodline/' + metricId)
        .then(res => res.json())
        .then(data => {
            // 隐藏旧的容器视图
            document.getElementById('bloodline-container').style.display = 'none';
            
            if (metricId === 'all') {
                // 绘制全部指标的力导向图
                renderBloodlineGraph(data);
            } else {
                // 绘制单个指标的力导向图（以该指标为中心）
                // 创建只包含当前指标及其上下游的数据集
                const singleMetricData = {};
                singleMetricData[metricId] = data;
                renderBloodlineGraph(singleMetricData);
            }
        });
}

// 力导向图相关变量
let bloodlineNodes = [];
let bloodlineEdges = [];
let bloodlineCanvas, bloodlineCtx;
let bloodlineAnimationId = null;
let bloodlineInitialized = false;
let bloodlineScrollBound = false;

// 渲染力导向图
function renderBloodlineGraph(bloodlineData) {
    // 停止之前的动画
    if (bloodlineAnimationId) {
        cancelAnimationFrame(bloodlineAnimationId);
        bloodlineAnimationId = null;
    }
    
    bloodlineCanvas = document.getElementById('bloodline-canvas');
    bloodlineCtx = bloodlineCanvas.getContext('2d');
    
    // 设置canvas尺寸
    resizeBloodlineCanvas();
    
    // 只绑定一次resize事件
    if (!bloodlineInitialized) {
        window.addEventListener('resize', resizeBloodlineCanvas);
        bloodlineInitialized = true;
    }
    
    // 绑定滚轮事件（只绑定一次）
    if (!bloodlineScrollBound) {
        bloodlineCanvas.addEventListener('wheel', handleWheelZoom);
        bloodlineScrollBound = true;
    }
    
    // 清空画布
    bloodlineCtx.clearRect(0, 0, bloodlineCanvas.width, bloodlineCanvas.height);
    
    // 构建节点和边
    bloodlineNodes = [];
    bloodlineEdges = [];
    
    // 添加核心指标节点（中心）
    const centerX = bloodlineCanvas.width / 2;
    const centerY = bloodlineCanvas.height / 2;
    
    Object.keys(bloodlineData).forEach((metricId, index) => {
        const data = bloodlineData[metricId];
        
        // 添加指标节点（放在中心位置）
        bloodlineNodes.push({
            id: metricId,
            name: data.metric_name,
            type: 'metric',
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0
        });
        
        // 添加上游节点
        if (data.upstream && Array.isArray(data.upstream)) {
            data.upstream.forEach((item, i) => {
                const nodeId = metricId + '_up_' + i;
                bloodlineNodes.push({
                    id: nodeId,
                    name: item.name || String(item),
                    type: 'upstream',
                    x: centerX - 180 + (Math.random() - 0.5) * 60,
                    y: centerY + (i - data.upstream.length / 2) * 70,
                    vx: 0,
                    vy: 0
                });
                
                bloodlineEdges.push({
                    source: nodeId,
                    target: metricId
                });
            });
        }
        
        // 添加下游节点
        if (data.downstream && Array.isArray(data.downstream)) {
            data.downstream.forEach((item, i) => {
                const nodeId = metricId + '_down_' + i;
                bloodlineNodes.push({
                    id: nodeId,
                    name: item.name || String(item),
                    type: 'downstream',
                    x: centerX + 180 + (Math.random() - 0.5) * 60,
                    y: centerY + (i - data.downstream.length / 2) * 70,
                    vx: 0,
                    vy: 0
                });
                
                bloodlineEdges.push({
                    source: metricId,
                    target: nodeId
                });
            });
        }
    });
    
    // 移除旧的事件监听器（如果存在）
    bloodlineCanvas.onclick = handleBloodlineClick;
    bloodlineCanvas.onmousemove = handleBloodlineHover;
    
    // 开始动画
    startBloodlineSimulation();
}

// 重置画布尺寸
function resizeBloodlineCanvas() {
    if (!bloodlineCanvas) return;
    
    const container = bloodlineCanvas.parentElement;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    
    // 保存当前图形
    bloodlineCanvas.width = width;
    bloodlineCanvas.height = height;
    bloodlineCanvas.style.width = width + 'px';
    bloodlineCanvas.style.height = height + 'px';
}

// 力导向图模拟
function startBloodlineSimulation() {
    if (bloodlineAnimationId) {
        cancelAnimationFrame(bloodlineAnimationId);
    }
    
    let iteration = 0;
    
    function simulate() {
        // 力导向图算法 - 调整参数使其更快稳定
        const repulsionForce = 3000;  // 减小排斥力
        const attractionForce = 0.02; // 增大吸引力
        const centerForce = 0.005;    // 减小向心力
        const damping = 0.95;         // 增大阻尼系数
        
        // 计算排斥力
        for (let i = 0; i < bloodlineNodes.length; i++) {
            for (let j = i + 1; j < bloodlineNodes.length; j++) {
                const dx = bloodlineNodes[j].x - bloodlineNodes[i].x;
                const dy = bloodlineNodes[j].y - bloodlineNodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                
                // 添加距离下限，避免近距离时力过大
                if (dist < 30) continue;
                
                const force = repulsionForce / (dist * dist);
                
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                bloodlineNodes[i].vx -= fx;
                bloodlineNodes[i].vy -= fy;
                bloodlineNodes[j].vx += fx;
                bloodlineNodes[j].vy += fy;
            }
        }
        
        // 计算吸引力（边的连接）
        bloodlineEdges.forEach(edge => {
            const source = bloodlineNodes.find(n => n.id === edge.source);
            const target = bloodlineNodes.find(n => n.id === edge.target);
            
            if (source && target) {
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = (dist - 120) * attractionForce;  // 减小目标距离
                
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                source.vx += fx;
                source.vy += fy;
                target.vx -= fx;
                target.vy -= fy;
            }
        });
        
        // 向心力
        const centerX = bloodlineCanvas.width / 2;
        const centerY = bloodlineCanvas.height / 2;
        
        bloodlineNodes.forEach(node => {
            node.vx += (centerX - node.x) * centerForce;
            node.vy += (centerY - node.y) * centerForce;
        });
        
        // 更新位置
        let totalVelocity = 0;
        bloodlineNodes.forEach(node => {
            node.vx *= damping;
            node.vy *= damping;
            node.x += node.vx;
            node.y += node.vy;
            
            // 计算总速度用于稳定检测
            totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
            
            // 边界约束
            const margin = 50;
            node.x = Math.max(margin, Math.min(bloodlineCanvas.width - margin, node.x));
            node.y = Math.max(margin, Math.min(bloodlineCanvas.height - margin, node.y));
        });
        
        // 绘制
        drawBloodlineGraph();
        
        iteration++;
        
        // 稳定检测：当总速度足够小或迭代次数足够多时停止动画
        if (totalVelocity < 0.5 || iteration > 500) {
            // 停止动画，但保持最后一帧显示
            return;
        }
        
        bloodlineAnimationId = requestAnimationFrame(simulate);
    }
    
    simulate();
}

// 绘制力导向图
function drawBloodlineGraph() {
    bloodlineCtx.clearRect(0, 0, bloodlineCanvas.width, bloodlineCanvas.height);
    
    // 保存上下文状态
    bloodlineCtx.save();
    
    // 计算中心点
    const centerX = bloodlineCanvas.width / 2;
    const centerY = bloodlineCanvas.height / 2;
    
    // 应用缩放变换（以中心为基准）
    bloodlineCtx.translate(centerX, centerY);
    bloodlineCtx.scale(bloodlineScale, bloodlineScale);
    bloodlineCtx.translate(-centerX, -centerY);
    
    // 绘制边
    bloodlineCtx.strokeStyle = '#cbd5e0';
    bloodlineCtx.lineWidth = 2;
    
    bloodlineEdges.forEach(edge => {
        const source = bloodlineNodes.find(n => n.id === edge.source);
        const target = bloodlineNodes.find(n => n.id === edge.target);
        
        if (source && target) {
            bloodlineCtx.beginPath();
            bloodlineCtx.moveTo(source.x, source.y);
            bloodlineCtx.lineTo(target.x, target.y);
            bloodlineCtx.stroke();
            
            // 绘制箭头
            const angle = Math.atan2(target.y - source.y, target.x - source.x);
            const arrowLength = 10;
            
            bloodlineCtx.beginPath();
            bloodlineCtx.moveTo(target.x, target.y);
            bloodlineCtx.lineTo(
                target.x - arrowLength * Math.cos(angle - Math.PI / 6),
                target.y - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            bloodlineCtx.moveTo(target.x, target.y);
            bloodlineCtx.lineTo(
                target.x - arrowLength * Math.cos(angle + Math.PI / 6),
                target.y - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            bloodlineCtx.stroke();
        }
    });
    
    // 绘制节点
    bloodlineNodes.forEach(node => {
        const colors = {
            'metric': '#667eea',
            'upstream': '#48bb78',
            'downstream': '#ed8936'
        };
        
        const baseRadius = node.type === 'metric' ? 30 : 22;
        const nodeRadius = baseRadius;  // 节点大小保持不变，只缩放位置
        
        // 绘制阴影
        bloodlineCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        bloodlineCtx.shadowBlur = 10;
        bloodlineCtx.shadowOffsetX = 2;
        bloodlineCtx.shadowOffsetY = 2;
        
        // 绘制圆球
        bloodlineCtx.fillStyle = colors[node.type] || '#667eea';
        bloodlineCtx.beginPath();
        bloodlineCtx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        bloodlineCtx.fill();
        
        // 重置阴影
        bloodlineCtx.shadowColor = 'transparent';
        
        // 绘制文字 - 根据圆球大小和文字长度调整字体
        bloodlineCtx.fillStyle = 'white';
        bloodlineCtx.textAlign = 'center';
        bloodlineCtx.textBaseline = 'middle';
        
        // 根据文字长度选择显示方式
        const maxDisplayLength = node.type === 'metric' ? 6 : 5;
        const displayName = node.name.length > maxDisplayLength 
            ? node.name.substring(0, maxDisplayLength) + '.' 
            : node.name;
        
        // 动态计算字体大小
        const baseFontSize = node.type === 'metric' ? 11 : 10;
        const fontSize = Math.max(8, baseFontSize - Math.floor(displayName.length / 2));
        bloodlineCtx.font = `bold ${fontSize}px Arial, Microsoft YaHei, sans-serif`;
        
        // 计算文字宽度，确保在圆球内
        const textWidth = bloodlineCtx.measureText(displayName).width;
        const maxTextWidth = (nodeRadius - 4) * 2;
        
        // 如果文字太宽，进一步缩小字体
        if (textWidth > maxTextWidth) {
            const scaleFactor = maxTextWidth / textWidth;
            const adjustedFontSize = Math.max(6, Math.floor(fontSize * scaleFactor));
            bloodlineCtx.font = `bold ${adjustedFontSize}px Arial, Microsoft YaHei, sans-serif`;
        }
        
        bloodlineCtx.fillText(displayName, node.x, node.y);
        
        // 指标节点添加图标
        if (node.type === 'metric') {
            bloodlineCtx.font = '14px FontAwesome';
            bloodlineCtx.fillText('\uf080', node.x, node.y - nodeRadius - 5);
        }
    });
    
    // 恢复上下文状态
    bloodlineCtx.restore();
}

// 处理节点点击
function handleBloodlineClick(event) {
    const rect = bloodlineCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - bloodlineCanvas.width / 2) / bloodlineScale + bloodlineCanvas.width / 2;
    const y = (event.clientY - rect.top - bloodlineCanvas.height / 2) / bloodlineScale + bloodlineCanvas.height / 2;
    
    bloodlineNodes.forEach(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 30) {
            showNodeInfo(node);
        }
    });
}
// 处理鼠标悬停
let hoveredNode = null;

function handleBloodlineHover(event) {
    const rect = bloodlineCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - bloodlineCanvas.width / 2) / bloodlineScale + bloodlineCanvas.width / 2;
    const y = (event.clientY - rect.top - bloodlineCanvas.height / 2) / bloodlineScale + bloodlineCanvas.height / 2;
    
    hoveredNode = null;
    bloodlineNodes.forEach(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 30) {
            hoveredNode = node;
            bloodlineCanvas.style.cursor = 'pointer';
        }
    });
    
    if (!hoveredNode) {
        bloodlineCanvas.style.cursor = 'default';
    }
}

// 显示节点信息
function showNodeInfo(node) {
    const panel = document.getElementById('bloodline-info-panel');
    const content = document.getElementById('info-panel-content');
    
    let html = `
        <div class="info-row">
            <span class="info-label">节点名称</span>
            <span class="info-value">${node.name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">节点类型</span>
            <span class="info-value">${node.type === 'metric' ? '核心指标' : node.type === 'upstream' ? '上游数据源' : '下游应用'}</span>
        </div>
    `;
    
    if (node.upstream && node.upstream.length > 0) {
        html += `
            <div class="info-fields">
                <div class="info-fields-title">上游数据源</div>
                ${node.upstream.map(item => `<span class="info-field-tag">${item.name || item}</span>`).join('')}
            </div>
        `;
    }
    
    if (node.downstream && node.downstream.length > 0) {
        html += `
            <div class="info-fields">
                <div class="info-fields-title">下游应用</div>
                ${node.downstream.map(item => `<span class="info-field-tag">${item.name || item}</span>`).join('')}
            </div>
        `;
    }
    
    // 如果是核心指标，添加查看指标明细按钮
    if (node.type === 'metric' && node.id) {
        html += `
            <div class="info-actions">
                <button class="btn btn-primary btn-sm" onclick="showMetricDetail('${node.id}'); closeInfoPanel();">
                    <i class="fas fa-chart-bar"></i> 查看指标明细
                </button>
            </div>
        `;
    }
    
    content.innerHTML = html;
    panel.classList.add('show');
}

// 关闭信息面板
function closeInfoPanel() {
    document.getElementById('bloodline-info-panel').classList.remove('show');
}

// 缩放功能
let bloodlineScale = 1;
const minScale = 0.5;
const maxScale = 2.5;
const scaleStep = 0.1;

// 放大
function zoomIn() {
    if (bloodlineScale < maxScale) {
        bloodlineScale += scaleStep;
        updateZoomDisplay();
        drawBloodlineGraph();
    }
}

// 缩小
function zoomOut() {
    if (bloodlineScale > minScale) {
        bloodlineScale -= scaleStep;
        updateZoomDisplay();
        drawBloodlineGraph();
    }
}

// 重置缩放
function resetZoom() {
    bloodlineScale = 1;
    updateZoomDisplay();
    drawBloodlineGraph();
}

// 更新缩放显示
function updateZoomDisplay() {
    const zoomValue = document.getElementById('zoom-value');
    if (zoomValue) {
        zoomValue.textContent = Math.round(bloodlineScale * 100) + '%';
    }
}

// 滚轮缩放处理
function handleWheelZoom(event) {
    event.preventDefault();
    
    // 根据滚轮方向调整缩放
    const delta = event.deltaY > 0 ? -scaleStep : scaleStep;
    const newScale = bloodlineScale + delta;
    
    // 限制缩放范围
    if (newScale >= minScale && newScale <= maxScale) {
        bloodlineScale = newScale;
        updateZoomDisplay();
        drawBloodlineGraph();
    }
}

// 加载预警数据
function loadAlertData() {
    // 加载预警规则
    fetch('/api/alerts')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('alert-list');
            list.innerHTML = data.map(rule => `
                <li class="alert-item">
                    <div>
                        <div class="alert-name">${rule.name}</div>
                        <div class="alert-condition">${rule.condition}</div>
                    </div>
                    <div class="alert-meta">
                        <span class="severity-tag severity-${rule.severity === '高' ? 'high' : rule.severity === '中' ? 'medium' : 'low'}">${rule.severity}</span>
                        <span style="font-size: 12px; color: #8898aa;">${rule.status}</span>
                    </div>
                </li>
            `).join('');
        });

    // 加载质量检查
    fetch('/api/quality')
        .then(res => res.json())
        .then(data => {
            const grid = document.getElementById('quality-grid');
            grid.innerHTML = data.map((item, index) => {
                const avgScore = ((item.completeness + item.consistency + item.timeliness + item.accuracy) / 4).toFixed(1);
                const statusClass = avgScore >= 98 ? 'excellent' : avgScore >= 95 ? 'good' : avgScore >= 90 ? 'normal' : 'poor';
                const statusText = avgScore >= 98 ? '优秀' : avgScore >= 95 ? '良好' : avgScore >= 90 ? '一般' : '待优化';
                return `
                <div class="quality-card" data-index="${index}" style="cursor: pointer;">
                    <div class="quality-card-header">
                        <span class="quality-metric-name">${item.name}</span>
                        <span class="quality-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="quality-item">
                        <span class="quality-item-label">完整性</span>
                        <span class="quality-item-value">${item.completeness}%</span>
                    </div>
                    <div class="quality-bar-container">
                        <div class="quality-bar" style="width: ${item.completeness}%; background: ${getQualityColor(item.completeness)}"></div>
                    </div>
                    <div class="quality-item">
                        <span class="quality-item-label">一致性</span>
                        <span class="quality-item-value">${item.consistency}%</span>
                    </div>
                    <div class="quality-bar-container">
                        <div class="quality-bar" style="width: ${item.consistency}%; background: ${getQualityColor(item.consistency)}"></div>
                    </div>
                    <div class="quality-item">
                        <span class="quality-item-label">及时性</span>
                        <span class="quality-item-value">${item.timeliness}%</span>
                    </div>
                    <div class="quality-bar-container">
                        <div class="quality-bar" style="width: ${item.timeliness}%; background: ${getQualityColor(item.timeliness)}"></div>
                    </div>
                    <div class="quality-item">
                        <span class="quality-item-label">准确性</span>
                        <span class="quality-item-value">${item.accuracy}%</span>
                    </div>
                    <div class="quality-bar-container">
                        <div class="quality-bar" style="width: ${item.accuracy}%; background: ${getQualityColor(item.accuracy)}"></div>
                    </div>
                    <div class="quality-card-footer">
                        <span class="view-detail">查看详情 <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            `}).join('');
            
            // 添加点击事件监听
            document.querySelectorAll('.quality-card').forEach((card, index) => {
                card.addEventListener('click', () => showQualityDetail(data[index]));
            });
        });
}

// 根据分数获取颜色
function getQualityColor(score) {
    if (score >= 95) return '#4caf50';
    if (score >= 90) return '#2196f3';
    if (score >= 85) return '#ff9800';
    return '#f44336';
}

// 显示质量规则配置
function showQualityRuleConfig() {
    document.getElementById('quality-config-modal').classList.add('show');
}

// 保存质量配置
function saveQualityConfig() {
    closeModal('quality-config-modal');
}

// 当前选中的质量检查项
let currentQualityItem = null;

// 显示质量检查详情
function showQualityDetail(item) {
    currentQualityItem = item;
    
    const avgScore = ((item.completeness + item.consistency + item.timeliness + item.accuracy) / 4).toFixed(1);
    const statusClass = avgScore >= 98 ? 'excellent' : avgScore >= 95 ? 'good' : avgScore >= 90 ? 'normal' : 'poor';
    const statusText = avgScore >= 98 ? '优秀' : avgScore >= 95 ? '良好' : avgScore >= 90 ? '一般' : '待优化';
    
    document.getElementById('quality-detail-title').textContent = `质量检查详情 - ${item.name}`;
    document.getElementById('quality-detail-content').innerHTML = `
        <div class="quality-detail-summary">
            <div class="quality-score-circle ${statusClass}">
                <span class="score-value">${avgScore}</span>
                <span class="score-label">综合评分</span>
            </div>
            <div class="quality-status-info">
                <span class="quality-status-badge ${statusClass}">${statusText}</span>
                <div class="quality-info-row">
                    <span>检查时间：${new Date().toLocaleString('zh-CN')}</span>
                </div>
                <div class="quality-info-row">
                    <span>指标ID：${item.id || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="quality-detail-section">
            <h4><i class="fas fa-chart-bar"></i> 质量维度分析</h4>
            <div class="quality-dimension-grid">
                <div class="dimension-item">
                    <div class="dimension-header">
                        <span class="dimension-name">完整性</span>
                        <span class="dimension-value">${item.completeness}%</span>
                    </div>
                    <div class="dimension-bar-container">
                        <div class="dimension-bar" style="width: ${item.completeness}%; background: ${getQualityColor(item.completeness)}"></div>
                    </div>
                    <div class="dimension-desc">数据记录完整程度，无缺失值比例</div>
                </div>
                <div class="dimension-item">
                    <div class="dimension-header">
                        <span class="dimension-name">一致性</span>
                        <span class="dimension-value">${item.consistency}%</span>
                    </div>
                    <div class="dimension-bar-container">
                        <div class="dimension-bar" style="width: ${item.consistency}%; background: ${getQualityColor(item.consistency)}"></div>
                    </div>
                    <div class="dimension-desc">数据逻辑一致，无矛盾冲突</div>
                </div>
                <div class="dimension-item">
                    <div class="dimension-header">
                        <span class="dimension-name">及时性</span>
                        <span class="dimension-value">${item.timeliness}%</span>
                    </div>
                    <div class="dimension-bar-container">
                        <div class="dimension-bar" style="width: ${item.timeliness}%; background: ${getQualityColor(item.timeliness)}"></div>
                    </div>
                    <div class="dimension-desc">数据按时更新，无延迟</div>
                </div>
                <div class="dimension-item">
                    <div class="dimension-header">
                        <span class="dimension-name">准确性</span>
                        <span class="dimension-value">${item.accuracy}%</span>
                    </div>
                    <div class="dimension-bar-container">
                        <div class="dimension-bar" style="width: ${item.accuracy}%; background: ${getQualityColor(item.accuracy)}"></div>
                    </div>
                    <div class="dimension-desc">数据精确无误，符合预期</div>
                </div>
            </div>
        </div>
        
        <div class="quality-detail-section">
            <h4><i class="fas fa-history"></i> 最近检查记录</h4>
            <div class="quality-history">
                <div class="history-item">
                    <span class="history-time">2024-01-15 14:30</span>
                    <span class="history-status ${statusClass}">${statusText}</span>
                    <span class="history-score">${avgScore}分</span>
                </div>
                <div class="history-item">
                    <span class="history-time">2024-01-14 14:30</span>
                    <span class="history-status ${avgScore >= 95 ? 'good' : 'normal'}">${avgScore >= 95 ? '良好' : '一般'}</span>
                    <span class="history-score">${(parseFloat(avgScore) - 1.2).toFixed(1)}分</span>
                </div>
                <div class="history-item">
                    <span class="history-time">2024-01-13 14:30</span>
                    <span class="history-status ${avgScore >= 95 ? 'good' : 'normal'}">${avgScore >= 95 ? '良好' : '一般'}</span>
                    <span class="history-score">${(parseFloat(avgScore) - 0.8).toFixed(1)}分</span>
                </div>
            </div>
        </div>
        
        <div class="quality-detail-section">
            <h4><i class="fas fa-lightbulb"></i> 优化建议</h4>
            <div class="quality-suggestions">
                ${generateSuggestions(item)}
            </div>
        </div>
    `;
    
    document.getElementById('quality-detail-modal').classList.add('show');
}

// 生成优化建议
function generateSuggestions(item) {
    const suggestions = [];
    if (item.completeness < 95) {
        suggestions.push('<div class="suggestion-item warning"><i class="fas fa-exclamation-circle"></i> 完整性得分较低，建议检查数据源是否存在缺失数据。</div>');
    }
    if (item.consistency < 95) {
        suggestions.push('<div class="suggestion-item warning"><i class="fas fa-exclamation-circle"></i> 一致性得分较低，建议检查数据逻辑是否存在冲突。</div>');
    }
    if (item.timeliness < 95) {
        suggestions.push('<div class="suggestion-item warning"><i class="fas fa-exclamation-circle"></i> 及时性得分较低，建议优化数据更新流程。</div>');
    }
    if (item.accuracy < 95) {
        suggestions.push('<div class="suggestion-item warning"><i class="fas fa-exclamation-circle"></i> 准确性得分较低，建议增加数据校验规则。</div>');
    }
    if (suggestions.length === 0) {
        suggestions.push('<div class="suggestion-item success"><i class="fas fa-check-circle"></i> 各项质量指标表现优秀，继续保持！</div>');
    }
    return suggestions.join('');
}

// 从质量详情查看指标详情
function viewMetricDetailFromQuality() {
    if (currentQualityItem) {
        closeModal('quality-detail-modal');
        // 根据指标名称查找对应的指标ID
        const metricId = findMetricIdByName(currentQualityItem.name);
        if (metricId) {
            showMetricDetail(metricId);
        }
    }
}

// 根据名称查找指标ID
function findMetricIdByName(name) {
    // 在指标列表中查找
    const metricsList = window.metricsData || [];
    const metric = metricsList.find(m => m.name === name);
    if (metric) return metric.id;
    
    // 在市场指标中查找
    const marketMetrics = window.marketData || [];
    const marketMetric = marketMetrics.find(m => m.name === name);
    if (marketMetric) return marketMetric.id;
    
    return null;
}

// 显示LLM配置弹窗
function showLLMConfigModal() {
    document.getElementById('llm-config-modal').classList.add('show');
}

// 保存LLM配置
function saveLLMConfig() {
    closeModal('llm-config-modal');
    document.getElementById('llm-config-status').textContent = '已配置';
}

// 显示报告生成弹窗
function showReportModal() {
    document.getElementById('report-modal').classList.add('show');
}

// 生成报告
function generateReport() {
    closeModal('report-modal');
    
    document.getElementById('report-result').style.display = 'block';
    document.getElementById('report-content').textContent = `【数据分析报告】

报告标题：${document.getElementById('report-title').value || '运营数据分析报告'}
生成时间：${new Date().toLocaleString('zh-CN')}

一、核心指标概览

1. 净利润率
   - 当前值：15.2%
   - 同比增长：+1.2%
   - 环比增长：+0.8%

2. ROE（净资产收益率）
   - 当前值：12.8%
   - 同比增长：+0.5%

3. 不良贷款率
   - 当前值：1.8%
   - 同比下降：-0.3%

4. 流动性比率
   - 当前值：58.6%
   - 环比增长：+3.2%

二、关键发现

1. 盈利能力保持稳定增长态势
2. 资产质量持续改善，不良贷款率稳步下降
3. 流动性状况良好，资金安全边际充足

三、建议

1. 持续关注不良贷款变化趋势
2. 优化资金配置，提高资金使用效率
3. 加强成本管控，提升盈利能力

---
本报告由AI自动生成`;
}

// 复制报告
function copyReport() {
    const content = document.getElementById('report-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
        alert('报告已复制到剪贴板');
    });
}

// 运行智能分析
function runIntelligentAnalysis() {
    document.getElementById('analysis-result').style.display = 'block';
    document.getElementById('analysis-content').textContent = `【AI智能分析结果】

分析时间：${new Date().toLocaleString('zh-CN')}

一、指标健康度分析

1. 原子指标健康度：85%（良好）
   - 数据完整性：92%
   - 数据准确性：88%
   - 更新及时性：85%

2. 派生指标健康度：72%（一般）
   - 计算逻辑一致性：78%
   - 数据源可靠性：75%

3. 复合指标健康度：55%（待优化）
   - 建议：加强数据质量管理

二、趋势预测

基于历史数据分析，预测下一周期：
- 净利润率预计保持在14.8%-15.5%区间
- 不良贷款率有望进一步下降至1.6%左右
- 流动性比率预计维持在55%-60%

三、风险预警

⚠️ 预警项：
1. 流动性比率接近预警线，建议关注
2. 部分指标数据延迟超过24小时

四、改进建议

1. 优化数据采集流程，减少数据延迟
2. 加强复合指标的数据校验规则
3. 建立定期数据质量巡检机制`;
}

// 显示指标解读
function showInterpretation() {
    document.getElementById('agent-interpretation').style.display = 'block';
    document.getElementById('interpretation-content').innerHTML = `
        <div class="interpretation-item">
            <h4><i class="fas fa-lightbulb"></i> 净利润率</h4>
            <p><strong>定义：</strong>净利润与营业收入的比率，反映企业盈利能力</p>
            <p><strong>业务含义：</strong>该指标越高，说明企业盈利能力越强，每一元收入带来的净利润越多。</p>
            <p><strong>关注要点：</strong>结合行业平均水平对比，分析成本控制和收入结构变化。</p>
        </div>
        <div class="interpretation-item">
            <h4><i class="fas fa-lightbulb"></i> ROE（净资产收益率）</h4>
            <p><strong>定义：</strong>净利润与平均股东权益的比率</p>
            <p><strong>业务含义：</strong>衡量股东权益的回报水平，反映企业运用自有资本的效率。</p>
            <p><strong>关注要点：</strong>与行业标杆对比，分析资本运作效率。</p>
        </div>
        <div class="interpretation-item">
            <h4><i class="fas fa-lightbulb"></i> 不良贷款率</h4>
            <p><strong>定义：</strong>不良贷款占总贷款的比例</p>
            <p><strong>业务含义：</strong>反映信贷资产质量，是风险管理的核心指标。</p>
            <p><strong>关注要点：</strong>跟踪变化趋势，及时发现风险隐患。</p>
        </div>
    `;
}

// 提交问题
function submitQuestion() {
    const question = document.getElementById('ask-input').value;
    if (!question.trim()) return;

    document.getElementById('ask-loading').style.display = 'block';
    document.getElementById('ask-result').style.display = 'none';
    document.getElementById('ask-error').style.display = 'none';

    setTimeout(() => {
        document.getElementById('ask-loading').style.display = 'none';
        document.getElementById('ask-question').textContent = question;
        document.getElementById('ask-answer').textContent = `根据您的问题，以下是相关分析：

基于系统中的指标数据，我为您分析如下：

1. **指标概览**：系统共包含17个核心指标，涵盖财务、风险、资金等多个维度

2. **热门指标**：
   - 净利润率（热度98）：反映企业盈利能力
   - 不良贷款率（热度96）：反映信贷资产质量
   - ROE（热度94）：衡量股东权益回报

3. **趋势分析**：
   近期整体指标表现稳健，净利润率保持在15%左右，不良贷款率呈下降趋势

4. **建议关注**：
   流动性比率接近预警线，建议持续关注资金状况

如需更详细的分析，请提供具体指标名称或时间段。`;
        document.getElementById('ask-result').style.display = 'block';
    }, 1500);
}

// 关闭弹窗
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// 显示数据预览
function showDataPreview(tableName, type) {
    // 设置弹窗标题
    document.getElementById('data-preview-title').textContent = `${type}数据预览 - ${tableName}`;
    
    // 显示加载状态
    const contentDiv = document.getElementById('data-preview-content');
    contentDiv.innerHTML = '<div class="loading-spinner">加载中...</div>';
    
    // 打开弹窗
    document.getElementById('data-preview-modal').classList.add('show');
    
    // 获取表数据
    fetch('/api/table_data/' + encodeURIComponent(tableName))
        .then(res => res.json())
        .then(data => {
            // 渲染表格
            let html = `
                <div class="table-info">
                    <span>表名: ${data.table_name}</span>
                    <span>总记录数: ${data.total}</span>
                </div>
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr>
                                ${data.columns.map(col => `<th>${col}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.rows.map(row => `
                                <tr>
                                    ${data.columns.map(col => `<td>${row[col]}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            contentDiv.innerHTML = html;
        })
        .catch(error => {
            contentDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载数据失败: ${error.message}</p>
                </div>
            `;
        });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 默认显示管理驾驶舱
    showPage('dashboard');
});

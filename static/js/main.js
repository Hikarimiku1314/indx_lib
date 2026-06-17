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
        'center': '指标中心',
        'market': '指标市场',
        'bloodline': '指标血缘',
        'alert': '智能预警',
        'agent': '智能助手'
    };
    document.getElementById('page-title').textContent = titles[page];

    // 加载数据
    currentPage = page;
    if (page === 'center') loadCenterData();
    else if (page === 'market') loadMarketData();
    else if (page === 'bloodline') loadBloodline('all');
    else if (page === 'alert') loadAlertData();
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
                        <div style="margin-top: 12px; text-align: right;">
                            <button class="btn btn-primary btn-sm" onclick="showQualityDetail('${qualityData.id}', '${metricId}')">
                                <i class="fas fa-search-plus"></i> 查看质量检查详情
                            </button>
                        </div>
                    </div>
                `;
            }

            // 构建业务属性内容
            // 处理血缘数据：上游（数据源）和下游（依赖指标）
            const bloodlineUpstream = (Array.isArray(data.bloodline_upstream) ? data.bloodline_upstream : (data.bloodline ? [data.bloodline] : []));
            const bloodlineDownstream = Array.isArray(data.bloodline_downstream) ? data.bloodline_downstream : [];
            const businessHtml = `
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <div class="detail-info-label">指标维度</div>
                        <div class="detail-info-value">${data.dimension || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">业务口径</div>
                        <div class="detail-info-value">${data.business_caliber || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">归属部门</div>
                        <div class="detail-info-value">${data.department || '-'}</div>
                    </div>
                </div>
            `;

            // 构建技术属性内容
            // 处理血缘数据：上游（数据源）和下游（依赖指标）
            const bloodlineUpstreamHtml = bloodlineUpstream.length > 0 ? `
                <ul class="detail-bloodline-list">
                    ${bloodlineUpstream.map(item => `
                        <li class="detail-bloodline-item" style="cursor: pointer;" onclick="showDataPreview('${item}', '表')" title="点击查看数据">
                            <i class="fas fa-arrow-up" style="color: #4a90d9; margin-right: 4px;"></i>
                            <span style="text-decoration: underline; text-decoration-style: dotted;">${item}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : '<span style="color: #8898aa;">-</span>';

            const bloodlineDownstreamHtml = bloodlineDownstream.length > 0 ? `
                <ul class="detail-bloodline-list">
                    ${bloodlineDownstream.map(item => `
                        <li class="detail-bloodline-item" style="cursor: pointer;" onclick="showDataPreview('${item}', '表')" title="点击查看数据">
                            <i class="fas fa-arrow-down" style="color: #f59e0b; margin-right: 4px;"></i>
                            <span style="text-decoration: underline; text-decoration-style: dotted;">${item}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : '<span style="color: #8898aa;">-</span>';

            const technicalHtml = `
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <div class="detail-info-label">指标更新时间</div>
                        <div class="detail-info-value">${data.update_time || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">下次预计更新时间</div>
                        <div class="detail-info-value">${data.next_update_time || '-'}</div>
                    </div>
                    <div class="detail-info-item" style="grid-column: 1 / -1;">
                        <div class="detail-info-label">指标血缘-上游（数据源）</div>
                        <div class="detail-info-value">${bloodlineUpstreamHtml}</div>
                    </div>
                    <div class="detail-info-item" style="grid-column: 1 / -1;">
                        <div class="detail-info-label">指标血缘-下游（依赖指标）</div>
                        <div class="detail-info-value">${bloodlineDownstreamHtml}</div>
                    </div>
                </div>
            `;

            // 构建管理属性内容
            const managementHtml = `
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <div class="detail-info-label">指标ID</div>
                        <div class="detail-info-value">${data.id}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">指标名称</div>
                        <div class="detail-info-value">${data.name}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">指标别名</div>
                        <div class="detail-info-value">${data.alias || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">指标类型</div>
                        <div class="detail-info-value">${data.type}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">指标分类</div>
                        <div class="detail-info-value">${data.category || '-'}</div>
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
                        <div class="detail-info-label">统计周期</div>
                        <div class="detail-info-value">${data.cycle}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">计量单位</div>
                        <div class="detail-info-value">${data.measure || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">单位</div>
                        <div class="detail-info-value">${data.unit || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">币种</div>
                        <div class="detail-info-value">${data.currency || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">来源</div>
                        <div class="detail-info-value">${data.source || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">加工方式</div>
                        <div class="detail-info-value">${data.processing || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">父指标</div>
                        <div class="detail-info-value">${data.parent || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">制定依据</div>
                        <div class="detail-info-value">${data.basis || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">统计规则</div>
                        <div class="detail-info-value">${data.stat_rule || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">资产编号</div>
                        <div class="detail-info-value">${data.asset_no || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">登记人员</div>
                        <div class="detail-info-value">${data.registrant || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">登记方式</div>
                        <div class="detail-info-value">${data.regist_method || '-'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="detail-info-label">登记时间</div>
                        <div class="detail-info-value">${data.regist_time || '-'}</div>
                    </div>
                </div>
            `;

            // 构建维度信息内容
            const dimensionHtml = `
                <div class="detail-info-grid">
                    <div class="detail-info-item" style="grid-column: 1 / -1;">
                        <div class="detail-info-label">维度列表</div>
                        <div class="detail-info-value">${data.dimensions || data.dimension || '-'}</div>
                    </div>
                </div>
            `;

            // 构建变更历史内容
            const historyHtml = `
                <pre style="color: #5a6c7d; line-height: 1.6; white-space: pre-wrap; font-family: inherit; margin: 0;">${data.history || '-'}</pre>
            `;

            // 构建数据血缘内容
            document.getElementById('detail-content').innerHTML = `
                <!-- 指标信息 -->
                <div class="detail-section detail-section-collapsible" data-section="info">
                    <div class="detail-section-header" onclick="toggleDetailSection('info')">
                        <h4 class="detail-section-title">
                            <i class="fas fa-info-circle"></i> 指标信息
                            <span class="detail-section-subtitle">(${getInfoItemCount(data)}个字段)</span>
                        </h4>
                        <i class="fas fa-chevron-down detail-section-toggle"></i>
                    </div>
                    <div class="detail-section-body">
                        <!-- 业务属性 -->
                        <div class="detail-subsection">
                            <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                                <i class="fas fa-briefcase"></i> 业务属性
                                <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                            </h5>
                            <div class="detail-subsection-body">${businessHtml}</div>
                        </div>
                        <!-- 管理属性 -->
                        <div class="detail-subsection">
                            <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                                <i class="fas fa-cog"></i> 管理属性
                                <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                            </h5>
                            <div class="detail-subsection-body">${managementHtml}</div>
                        </div>
                        <!-- 维度信息 -->
                        <div class="detail-subsection">
                            <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                                <i class="fas fa-layer-group"></i> 维度信息
                                <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                            </h5>
                            <div class="detail-subsection-body">${dimensionHtml}</div>
                        </div>
                        <!-- 技术属性 -->
                        <div class="detail-subsection">
                            <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                                <i class="fas fa-code"></i> 技术属性
                                <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                            </h5>
                            <div class="detail-subsection-body">${technicalHtml}</div>
                        </div>
                        <!-- 变更历史 -->
                        <div class="detail-subsection">
                            <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                                <i class="fas fa-history"></i> 变更历史
                                <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                            </h5>
                            <div class="detail-subsection-body">${historyHtml}</div>
                        </div>
                    </div>
                </div>

                <!-- 数据质量 -->
                <div class="detail-section detail-section-collapsible" data-section="quality">
                    <div class="detail-section-header" onclick="toggleDetailSection('quality')">
                        <h4 class="detail-section-title">
                            <i class="fas fa-check-circle"></i> 数据质量
                        </h4>
                        <i class="fas fa-chevron-down detail-section-toggle"></i>
                    </div>
                    <div class="detail-section-body">${qualityHtml || '<p style="color: #5a6c7d;">暂无质量数据</p>'}</div>
                </div>

                <!-- 趋势数据 -->
                <div class="detail-section detail-section-collapsible" data-section="trend">
                    <div class="detail-section-header" onclick="toggleDetailSection('trend')">
                        <h4 class="detail-section-title">
                            <i class="fas fa-chart-line"></i> 趋势数据
                        </h4>
                        <i class="fas fa-chevron-down detail-section-toggle"></i>
                    </div>
                    <div class="detail-section-body">
                        <div class="trend-toolbar">
                            <div class="trend-view-switch">
                                <button class="trend-view-btn active" data-view="chart" onclick="switchTrendView('chart', '${metricId}')">
                                    <i class="fas fa-chart-line"></i> 图表
                                </button>
                                <button class="trend-view-btn" data-view="table" onclick="switchTrendView('table', '${metricId}')">
                                    <i class="fas fa-table"></i> 二维表
                                </button>
                            </div>
                            <div class="trend-date-range">
                                <label>日期范围：</label>
                                <input type="date" id="trend-start-date" class="trend-date-input" onchange="updateTrendDateRange('${metricId}')">
                                <span>至</span>
                                <input type="date" id="trend-end-date" class="trend-date-input" onchange="updateTrendDateRange('${metricId}')">
                            </div>
                        </div>
                        <div id="trend-chart-container" style="height: 280px; margin-top: 15px;">
                            <canvas id="metric-detail-chart"></canvas>
                        </div>
                        <div id="trend-table-container" style="display: none; margin-top: 15px;">
                            <div class="table-wrapper">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>日期</th>
                                            <th>指标值</th>
                                            <th>单位</th>
                                        </tr>
                                    </thead>
                                    <tbody id="trend-table-body"></tbody>
                                </table>
                            </div>
                            <div class="table-pagination">
                                <button class="btn btn-sm btn-secondary" onclick="changeTrendPage(-1)">
                                    <i class="fas fa-chevron-left"></i> 上一页
                                </button>
                                <span class="pagination-info" id="trend-pagination-info">第 1 页，共 1 页</span>
                                <button class="btn btn-sm btn-secondary" onclick="changeTrendPage(1)">
                                    下一页 <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            `;

            document.getElementById('detail-modal').classList.add('show');

            // 渲染趋势图表
            trendState.metricId = metricId;
            trendState.unit = (data.measure || '') + (data.unit || '');
            trendState.currentPage = 1;
            
            fetch('/api/metric/trend/' + metricId)
                .then(res => res.json())
                .catch(() => {
                    return generateMockTrendData(metricId);
                })
                .then(trendData => {
                    trendState.data = trendData.data || [];
                    // 设置日期范围默认值
                    if (trendState.data.length > 0) {
                        document.getElementById('trend-start-date').value = trendState.data[0].date;
                        document.getElementById('trend-end-date').value = trendState.data[trendState.data.length - 1].date;
                        trendState.startDate = trendState.data[0].date;
                        trendState.endDate = trendState.data[trendState.data.length - 1].date;
                    }
                    renderTrendChart(trendState.data);
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

// 切换详情区域展开/收起
function toggleDetailSection(sectionName) {
    const section = document.querySelector(`[data-section="${sectionName}"]`);
    if (section) {
        section.classList.toggle('collapsed');
    }
}

// 切换子区域展开/收起
function toggleSubSection(el) {
    const subsection = el.parentElement;
    subsection.classList.toggle('collapsed');
}

// 计算指标信息的字段数量
function getInfoItemCount(data) {
    let count = 0;
    if (data.dimension) count++;
    if (data.business_caliber) count++;
    if (data.department) count++;
    if (data.bloodline) count++;
    count += 20; // 管理属性的字段数
    if (data.dimensions || data.dimension) count++;
    if (data.history) count++;
    return count;
}

// 趋势数据状态
let trendState = {
    metricId: null,
    data: [],
    currentPage: 1,
    pageSize: 10,
    unit: '',
    startDate: null,
    endDate: null,
    currentView: 'chart',
    chartInstance: null
};

// 切换趋势视图
function switchTrendView(view, metricId) {
    trendState.currentView = view;
    document.querySelectorAll('.trend-view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.getElementById('trend-chart-container').style.display = view === 'chart' ? 'block' : 'none';
    document.getElementById('trend-table-container').style.display = view === 'table' ? 'block' : 'none';
    if (view === 'table') {
        renderTrendTable();
    } else {
        // 重新渲染图表
        if (trendState.data.length > 0) {
            renderTrendChart(trendState.data);
        }
    }
}

// 渲染趋势图表
function renderTrendChart(data) {
    if (trendState.chartInstance) {
        trendState.chartInstance.destroy();
    }
    const ctx = document.getElementById('metric-detail-chart').getContext('2d');
    trendState.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date.slice(5)),
            datasets: [{
                label: '指标值',
                data: data.map(d => d.value),
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
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#edf2f7' } }
            }
        }
    });
}

// 渲染趋势表格
function renderTrendTable() {
    const filtered = getFilteredTrendData();
    const start = (trendState.currentPage - 1) * trendState.pageSize;
    const end = start + trendState.pageSize;
    const pageData = filtered.slice(start, end);
    const totalPages = Math.ceil(filtered.length / trendState.pageSize) || 1;

    const tbody = document.getElementById('trend-table-body');
    tbody.innerHTML = pageData.map(d => `
        <tr>
            <td>${d.date}</td>
            <td>${d.value}</td>
            <td>${trendState.unit}</td>
        </tr>
    `).join('');

    document.getElementById('trend-pagination-info').textContent = `第 ${trendState.currentPage} 页，共 ${totalPages} 页`;
}

// 获取过滤后的趋势数据
function getFilteredTrendData() {
    let data = trendState.data;
    if (trendState.startDate) {
        data = data.filter(d => d.date >= trendState.startDate);
    }
    if (trendState.endDate) {
        data = data.filter(d => d.date <= trendState.endDate);
    }
    return data;
}

// 切换翻页
function changeTrendPage(delta) {
    const filtered = getFilteredTrendData();
    const totalPages = Math.ceil(filtered.length / trendState.pageSize) || 1;
    const newPage = trendState.currentPage + delta;
    if (newPage < 1 || newPage > totalPages) return;
    trendState.currentPage = newPage;
    renderTrendTable();
}

// 更新日期范围
function updateTrendDateRange(metricId) {
    trendState.startDate = document.getElementById('trend-start-date').value || null;
    trendState.endDate = document.getElementById('trend-end-date').value || null;
    trendState.currentPage = 1;
    if (trendState.currentView === 'table') {
        renderTrendTable();
    } else {
        const filtered = getFilteredTrendData();
        renderTrendChart(filtered);
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
        // 业务属性
        dimension: document.getElementById('add-dimension').value,
        department: document.getElementById('add-department').value,
        business_caliber: document.getElementById('add-caliber').value,
        
        // 技术属性
        bloodline: document.getElementById('add-bloodline').value,
        
        // 管理属性
        name: document.getElementById('add-name').value,
        alias: document.getElementById('add-alias').value,
        type: document.getElementById('add-type').value,
        measure: document.getElementById('add-measure').value,
        unit: document.getElementById('add-unit').value,
        currency: document.getElementById('add-currency').value,
        source: document.getElementById('add-source').value,
        processing: document.getElementById('add-processing').value,
        parent: document.getElementById('add-parent').value,
        category: document.getElementById('add-category').value,
        basis: document.getElementById('add-basis').value,
        asset_no: document.getElementById('add-asset-no').value,
        stat_rule: document.getElementById('add-stat-rule').value,
        registrant: document.getElementById('add-registrant').value,
        regist_method: document.getElementById('add-regist-method').value,
        regist_time: document.getElementById('add-regist-time').value,
        owner: document.getElementById('add-owner').value,
        
        // 维度信息
        dimensions: document.getElementById('add-dimensions').value,
        
        // 变更历史
        history: document.getElementById('add-history').value
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
let allMarketData = [];
let currentCategory = '全部';
let currentKeyword = '';

function loadMarketData() {
    fetch('/api/market')
        .then(res => res.json())
        .then(data => {
            allMarketData = data;
            updateMarketStats(data);
            renderMarketCards(data);
            
            document.getElementById('market-search').addEventListener('input', handleSearchInput);
        });
}

function updateMarketStats(data) {
    document.getElementById('total-metrics').textContent = data.length;
    document.getElementById('authorized-metrics').textContent = data.filter(m => m.permission === '已授权').length;
    document.getElementById('popular-metrics').textContent = data.filter(m => m.popularity >= 80).length;
}

function renderMarketCards(data) {
    const grid = document.getElementById('market-grid');
    const emptyState = document.getElementById('market-empty');
    
    if (data.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    grid.innerHTML = data.map(metric => {
        const isAuthorized = metric.permission === '已授权';
        const isSelected = selectedMetrics.some(m => m.id === metric.id);
        const statusClass = isAuthorized ? 'authorized' : (metric.permission === '审批中' ? 'pending' : 'unauthorized');
        
        return `
            <div class="market-card ${isSelected ? 'selected' : ''}" onclick="toggleMetricCard('${metric.id}', '${metric.name}', '${metric.category}', '${metric.unit || '-'}', '${metric.permission}')">
                <div class="market-card-header">
                    <h3 class="market-card-title">${metric.name}</h3>
                    <span class="market-card-category">${metric.category}</span>
                </div>
                <div class="market-card-body">
                    <p>${metric.description}</p>
                </div>
                <div class="market-card-footer">
                    <div class="market-popularity">
                        <i class="fas fa-fire"></i>
                        <span>${metric.popularity}</span>
                    </div>
                    <span class="market-card-status ${statusClass}">${metric.permission}</span>
                </div>
                <div class="market-card-actions">
                    <button class="market-card-btn ${isAuthorized ? 'primary' : 'disabled'}" onclick="event.stopPropagation(); showMarketMetricDetail('${metric.id}')">
                        <i class="fas fa-info-circle"></i> 详情
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function handleSearchInput() {
    const keyword = document.getElementById('market-search').value.trim();
    const clearBtn = document.getElementById('search-clear');
    
    if (keyword) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    currentKeyword = keyword;
    filterAndRenderMarket();
}

function clearSearch() {
    document.getElementById('market-search').value = '';
    document.getElementById('search-clear').style.display = 'none';
    currentKeyword = '';
    filterAndRenderMarket();
}

function filterByCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    filterAndRenderMarket();
}

function sortMarket() {
    const sortType = document.getElementById('market-sort').value;
    filterAndRenderMarket(sortType);
}

function filterAndRenderMarket(sortType) {
    let filtered = allMarketData;
    
    if (currentCategory !== '全部') {
        filtered = filtered.filter(m => m.category === currentCategory);
    }
    
    if (currentKeyword) {
        const kw = currentKeyword.toLowerCase();
        filtered = filtered.filter(m => 
            m.name.toLowerCase().includes(kw) || 
            m.description.toLowerCase().includes(kw) ||
            m.category.toLowerCase().includes(kw)
        );
    }
    
    const sortBy = sortType || document.getElementById('market-sort').value;
    filtered.sort((a, b) => {
        if (sortBy === 'popularity') {
            return b.popularity - a.popularity;
        } else if (sortBy === 'name') {
            return a.name.localeCompare(b.name, 'zh-CN');
        } else {
            return new Date(b.update_time) - new Date(a.update_time);
        }
    });
    
    renderMarketCards(filtered);
}

function refreshMarket() {
    loadMarketData();
}

function toggleMetricCard(id, name, category, unit, permission) {
    if (permission !== '已授权') {
        showMarketMetricDetail(id);
        return;
    }
    
    const isSelected = selectedMetrics.some(m => m.id === id);
    
    if (isSelected) {
        selectedMetrics = selectedMetrics.filter(m => m.id !== id);
    } else {
        if (selectedMetrics.length >= 5) {
            alert('最多只能选择5个指标');
            return;
        }
        selectedMetrics.push({ id, name, category, unit, permission });
    }
    
    updateSelectedMetricsPanel();
    filterAndRenderMarket();
}

// 更新已选指标面板
function updateSelectedMetricsPanel() {
    const countDisplay = document.getElementById('selection-count');
    const listContainer = document.getElementById('selection-list');
    const compareBtn = document.getElementById('compare-btn');
    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    const generateReportBtn = document.getElementById('generate-report-btn');

    countDisplay.textContent = `${selectedMetrics.length}/5`;
    compareBtn.disabled = selectedMetrics.length < 2;

    const hasSelection = selectedMetrics.length > 0;

    runAnalysisBtn.disabled = !hasSelection;
    generateReportBtn.disabled = !hasSelection;

    if (hasSelection) {
        fetchAIInsights();
    }

    if (selectedMetrics.length === 0) {
        listContainer.innerHTML = `
            <div class="panel-empty">
                <i class="fas fa-hand-pointer"></i>
                <p>点击指标卡片添加到分析列表</p>
            </div>
        `;
    } else {
        listContainer.innerHTML = selectedMetrics.map(m => `
            <div class="selection-item">
                <div class="selection-item-info">
                    <div class="selection-item-name">${m.name}</div>
                    <div class="selection-item-category">${m.category}</div>
                </div>
                <button class="selection-item-remove" onclick="removeMetric('${m.id}')">
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
    filterAndRenderMarket();
}

// 清空选择
function clearAllSelection() {
    selectedMetrics = [];
    updateSelectedMetricsPanel();
    filterAndRenderMarket();
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

// 显示市场指标简化版详情（未授权/审批中）
function showMarketMetricDetailSimple(metric) {
    const modalContent = document.getElementById('detail-content');
    const modalTitle = document.getElementById('detail-title');
    const isAuthorized = metric.permission === '已授权';

    modalTitle.textContent = metric.name;

    // 业务属性
    const businessHtml = `
        <div class="detail-info-grid">
            <div class="detail-info-item">
                <div class="detail-info-label">指标维度</div>
                <div class="detail-info-value">${metric.dimension || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">业务口径</div>
                <div class="detail-info-value">${metric.business_caliber || metric.description || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">归属部门</div>
                <div class="detail-info-value">${metric.department || '-'}</div>
            </div>
        </div>
    `;

    // 管理属性
    const managementHtml = `
        <div class="detail-info-grid">
            <div class="detail-info-item">
                <div class="detail-info-label">指标ID</div>
                <div class="detail-info-value">${metric.id}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">指标名称</div>
                <div class="detail-info-value">${metric.name}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">指标别名</div>
                <div class="detail-info-value">${metric.alias || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">指标类型</div>
                <div class="detail-info-value">${metric.type || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">指标分类</div>
                <div class="detail-info-value">${metric.category || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">状态</div>
                <div class="detail-info-value"><span class="status-badge ${isAuthorized ? 'status-authorized' : 'status-pending'}">${metric.permission || metric.status || '审批中'}</span></div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">负责人</div>
                <div class="detail-info-value">${metric.owner || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">统计周期</div>
                <div class="detail-info-value">${metric.cycle || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">计量单位</div>
                <div class="detail-info-value">${metric.measure || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">单位</div>
                <div class="detail-info-value">${metric.unit || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">币种</div>
                <div class="detail-info-value">${metric.currency || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">来源</div>
                <div class="detail-info-value">${metric.source || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">加工方式</div>
                <div class="detail-info-value">${metric.processing || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">父指标</div>
                <div class="detail-info-value">${metric.parent || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">制定依据</div>
                <div class="detail-info-value">${metric.basis || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">统计规则</div>
                <div class="detail-info-value">${metric.stat_rule || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">资产编号</div>
                <div class="detail-info-value">${metric.asset_no || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">登记人员</div>
                <div class="detail-info-value">${metric.registrant || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">登记方式</div>
                <div class="detail-info-value">${metric.regist_method || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">登记时间</div>
                <div class="detail-info-value">${metric.regist_time || '-'}</div>
            </div>
        </div>
    `;

    // 维度信息
    const dimensionHtml = `
        <div class="detail-info-grid">
            <div class="detail-info-item" style="grid-column: 1 / -1;">
                <div class="detail-info-label">维度列表</div>
                <div class="detail-info-value">${metric.dimensions || metric.dimension || '-'}</div>
            </div>
        </div>
    `;

    // 技术属性
    const bloodlineUpstream = Array.isArray(metric.bloodline_upstream) ? metric.bloodline_upstream : (metric.bloodline ? [metric.bloodline] : []);
    const bloodlineDownstream = Array.isArray(metric.bloodline_downstream) ? metric.bloodline_downstream : [];
    const bloodlineUpstreamHtml = bloodlineUpstream.length > 0 ? `
        <ul class="detail-bloodline-list">
            ${bloodlineUpstream.map(item => `
                <li class="detail-bloodline-item" style="cursor: pointer;" onclick="showDataPreview('${item}', '表')" title="点击查看数据">
                    <i class="fas fa-arrow-up" style="color: #4a90d9; margin-right: 4px;"></i>
                    <span style="text-decoration: underline; text-decoration-style: dotted;">${item}</span>
                </li>
            `).join('')}
        </ul>
    ` : '<span style="color: #8898aa;">-</span>';
    const bloodlineDownstreamHtml = bloodlineDownstream.length > 0 ? `
        <ul class="detail-bloodline-list">
            ${bloodlineDownstream.map(item => `
                <li class="detail-bloodline-item" style="cursor: pointer;" onclick="showDataPreview('${item}', '表')" title="点击查看数据">
                    <i class="fas fa-arrow-down" style="color: #f59e0b; margin-right: 4px;"></i>
                    <span style="text-decoration: underline; text-decoration-style: dotted;">${item}</span>
                </li>
            `).join('')}
        </ul>
    ` : '<span style="color: #8898aa;">-</span>';

    const technicalHtml = `
        <div class="detail-info-grid">
            <div class="detail-info-item">
                <div class="detail-info-label">指标更新时间</div>
                <div class="detail-info-value">${metric.update_time || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">下次预计更新时间</div>
                <div class="detail-info-value">${metric.next_update_time || '-'}</div>
            </div>
            <div class="detail-info-item" style="grid-column: 1 / -1;">
                <div class="detail-info-label">指标血缘-上游（数据源）</div>
                <div class="detail-info-value">${bloodlineUpstreamHtml}</div>
            </div>
            <div class="detail-info-item" style="grid-column: 1 / -1;">
                <div class="detail-info-label">指标血缘-下游（依赖指标）</div>
                <div class="detail-info-value">${bloodlineDownstreamHtml}</div>
            </div>
        </div>
    `;

    // 变更历史
    const historyHtml = `
        <pre style="color: #5a6c7d; line-height: 1.6; white-space: pre-wrap; font-family: inherit; margin: 0;">${metric.history || '-'}</pre>
    `;

    let htmlContent = `
        <div class="detail-section detail-section-collapsible" data-section="info">
            <div class="detail-section-header" onclick="toggleDetailSection('info')">
                <h4 class="detail-section-title">
                    <i class="fas fa-info-circle"></i> 指标信息
                </h4>
                <i class="fas fa-chevron-down detail-section-toggle"></i>
            </div>
            <div class="detail-section-body">
                <div class="detail-subsection">
                    <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                        <i class="fas fa-briefcase"></i> 业务属性
                        <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                    </h5>
                    <div class="detail-subsection-body">${businessHtml}</div>
                </div>
                <div class="detail-subsection">
                    <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                        <i class="fas fa-cog"></i> 管理属性
                        <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                    </h5>
                    <div class="detail-subsection-body">${managementHtml}</div>
                </div>
                <div class="detail-subsection">
                    <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                        <i class="fas fa-layer-group"></i> 维度信息
                        <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                    </h5>
                    <div class="detail-subsection-body">${dimensionHtml}</div>
                </div>
                <div class="detail-subsection">
                    <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                        <i class="fas fa-code"></i> 技术属性
                        <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                    </h5>
                    <div class="detail-subsection-body">${technicalHtml}</div>
                </div>
                <div class="detail-subsection">
                    <h5 class="detail-subsection-title" onclick="toggleSubSection(this)">
                        <i class="fas fa-history"></i> 变更历史
                        <i class="fas fa-chevron-down detail-subsection-toggle"></i>
                    </h5>
                    <div class="detail-subsection-body">${historyHtml}</div>
                </div>
            </div>
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
                    <span>该指标尚未授权（${metric.permission || '审批中'}），暂不支持查看趋势数据</span>
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

// 加载血缘数据
function loadBloodline(metricId) {
    fetch('/api/bloodline/' + metricId)
        .then(res => res.json())
        .then(data => {
            if (Object.keys(data).length > 0) {
                bloodlineData = data;
                isMultiMode = metricId === 'all';
                if (metricId === 'all') {
                    initMultiForceGraph(data);
                } else {
                    initForceGraph(data, metricId);
                }
            }
        });
}

// 全局变量
let bloodlineCtx = null;
let bloodlineNodes = [];
let bloodlineLinks = [];
let bloodlineData = {};
let animationId = null;
let selectedNode = null;
let draggingNode = null;
let dragNodeOffsetX = 0;
let dragNodeOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isMultiMode = false;
let hasMoved = false;

// 停止动画
function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// 移除画布事件
function removeCanvasEvents() {
    const canvas = document.getElementById('bloodline-canvas');
    if (canvas) {
        canvas.removeEventListener('click', onCanvasClick);
        canvas.removeEventListener('mousemove', onCanvasMouseMove);
        canvas.removeEventListener('wheel', onCanvasWheel);
        canvas.removeEventListener('mousedown', onCanvasMouseDown);
        canvas.removeEventListener('mousemove', onCanvasDrag);
        canvas.removeEventListener('mouseup', onCanvasMouseUp);
        canvas.removeEventListener('mouseleave', onCanvasMouseUp);
    }
}

// 初始化力导向图（单个指标）
function initForceGraph(data, metricId) {
    const canvas = document.getElementById('bloodline-canvas');
    const container = document.querySelector('.bloodline-canvas-container');
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    bloodlineCtx = canvas.getContext('2d');

    // 重置缩放和平移
    scale = 1;
    offsetX = 0;
    offsetY = 0;

    // 清空之前的数据
    bloodlineNodes = [];
    bloodlineLinks = [];
    selectedNode = null;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 添加核心指标节点
    bloodlineNodes.push({
        id: 'center',
        name: data.metric_name,
        type: 'center',
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        radius: 35,
        color: '#667eea',
        data: { metricId }
    });

    // 添加上游数据源节点
    const upstreamCount = data.upstream.length;
    data.upstream.forEach((item, index) => {
        const angle = (index / upstreamCount) * Math.PI - Math.PI / 2;
        const distance = 150 + Math.random() * 50;
        bloodlineNodes.push({
            id: 'upstream-' + index,
            name: item.name,
            type: 'upstream',
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: 22,
            color: '#48bb78',
            data: item
        });
        bloodlineLinks.push({
            source: 'upstream-' + index,
            target: 'center',
            type: 'upstream'
        });
    });

    // 添加下游应用节点
    const downstreamCount = data.downstream.length;
    data.downstream.forEach((item, index) => {
        const angle = (index / downstreamCount) * Math.PI + Math.PI / 2;
        const distance = 150 + Math.random() * 50;
        bloodlineNodes.push({
            id: 'downstream-' + index,
            name: item.name,
            type: 'downstream',
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: 22,
            color: '#ed8936',
            data: item
        });
        bloodlineLinks.push({
            source: 'center',
            target: 'downstream-' + index,
            type: 'downstream'
        });
    });

    // 添加鼠标事件
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('wheel', onCanvasWheel);
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasDrag);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseUp);

    // 开始动画
    animate();
}

// 初始化力导向图（多个指标）
function initMultiForceGraph(allData) {
    const canvas = document.getElementById('bloodline-canvas');
    const container = document.querySelector('.bloodline-canvas-container');
    
    // 增大画布尺寸，提供更大的布局空间
    const scaleFactor = 4;
    canvas.width = container.clientWidth * scaleFactor;
    canvas.height = container.clientHeight * scaleFactor;
    bloodlineCtx = canvas.getContext('2d');

    // 重置缩放和平移
    scale = 0.65;
    offsetX = 0;
    offsetY = 0;

    // 清空之前的数据
    bloodlineNodes = [];
    bloodlineLinks = [];
    selectedNode = null;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 定义核心指标颜色
    const centerColors = [
        '#667eea', '#764ba2', '#f093fb', '#4facfe', 
        '#43e97b', '#38f9d7', '#fa709a'
    ];

    // 获取所有指标ID
    const metricIds = Object.keys(allData);

    const metricCount = metricIds.length;

    // 为每个指标创建节点
    metricIds.forEach((metricId, index) => {
        const data = allData[metricId];
        
        const angle = (index / metricCount) * Math.PI * 2;
        const distance = 100 + Math.random() * 30;
        
        // 添加核心指标节点
        const centerId = 'center-' + metricId;
        bloodlineNodes.push({
            id: centerId,
            name: data.metric_name,
            type: 'center',
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: 30,
            color: centerColors[index % centerColors.length],
            data: { metricId }
        });

        // 添加上游数据源节点
        data.upstream.forEach((item, upstreamIndex) => {
            const upstreamAngle = angle - Math.PI / 2 + (upstreamIndex / data.upstream.length) * Math.PI;
            const upstreamDistance = 120 + Math.random() * 40;
            const nodeId = 'upstream-' + metricId + '-' + upstreamIndex;
            
            // 检查是否已存在同名数据源节点
            const existingNode = bloodlineNodes.find(n => n.name === item.name && n.type === 'upstream');
            if (existingNode) {
                bloodlineLinks.push({
                    source: existingNode.id,
                    target: centerId,
                    type: 'upstream'
                });
            } else {
                bloodlineNodes.push({
                    id: nodeId,
                    name: item.name,
                    type: 'upstream',
                    x: centerX + Math.cos(upstreamAngle) * (distance + upstreamDistance),
                    y: centerY + Math.sin(upstreamAngle) * (distance + upstreamDistance),
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    radius: 20,
                    color: '#48bb78',
                    data: item
                });
                bloodlineLinks.push({
                    source: nodeId,
                    target: centerId,
                    type: 'upstream'
                });
            }
        });

        // 添加下游应用节点
        data.downstream.forEach((item, downstreamIndex) => {
            const downstreamAngle = angle + Math.PI / 2 + (downstreamIndex / data.downstream.length) * Math.PI;
            const downstreamDistance = 120 + Math.random() * 40;
            const nodeId = 'downstream-' + metricId + '-' + downstreamIndex;
            
            // 检查是否已存在同名下游节点
            const existingNode = bloodlineNodes.find(n => n.name === item.name && n.type === 'downstream');
            if (existingNode) {
                bloodlineLinks.push({
                    source: centerId,
                    target: existingNode.id,
                    type: 'downstream'
                });
            } else {
                bloodlineNodes.push({
                    id: nodeId,
                    name: item.name,
                    type: 'downstream',
                    x: centerX + Math.cos(downstreamAngle) * (distance + downstreamDistance),
                    y: centerY + Math.sin(downstreamAngle) * (distance + downstreamDistance),
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    radius: 20,
                    color: '#ed8936',
                    data: item
                });
                bloodlineLinks.push({
                    source: centerId,
                    target: nodeId,
                    type: 'downstream'
                });
            }
        });
    });

    // 添加鼠标事件
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('wheel', onCanvasWheel);
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasDrag);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseUp);

    // 自动滚动到画布中心
    setTimeout(() => {
        const container = canvas.parentElement;
        container.scrollLeft = (canvas.width - container.offsetWidth) / 2;
        container.scrollTop = (canvas.height - container.offsetHeight) / 2;
    }, 100);

    // 开始动画
    animate();
}

// 力导向算法
function applyForces() {
    const canvas = document.getElementById('bloodline-canvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRepulsion = 3000;
    const strongRepulsion = 8000;
    const attraction = 0.008;
    const damping = 0.96;
    const centerGravity = 0.001;
    const maxVelocity = 12;

    // 节点间排斥力
    for (let i = 0; i < bloodlineNodes.length; i++) {
        for (let j = i + 1; j < bloodlineNodes.length; j++) {
            const node1 = bloodlineNodes[i];
            const node2 = bloodlineNodes[j];
            const dx = node2.x - node1.x;
            const dy = node2.y - node1.y;
            const rawDist = Math.sqrt(dx * dx + dy * dy);
            
            const minDist = node1.radius + node2.radius + 25;
            const dist = rawDist < 15 ? 15 : rawDist;
            
            let repulsion = baseRepulsion;
            
            if (dist < minDist) {
                const factor = Math.min(4, minDist / dist);
                repulsion = strongRepulsion * factor;
            }
            
            if (node1.type === 'center' && node2.type === 'center') {
                repulsion *= 1.5;
            }
            
            const force = repulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            node1.vx -= fx * 0.5;
            node1.vy -= fy * 0.5;
            node2.vx += fx * 0.5;
            node2.vy += fy * 0.5;
        }
    }

    // 连线吸引力
    bloodlineLinks.forEach(link => {
        const source = bloodlineNodes.find(n => n.id === link.source);
        const target = bloodlineNodes.find(n => n.id === link.target);
        
        if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            let targetDist = 250;
            if (source.type === 'center' && target.type === 'center') {
                targetDist = 350;
            }
            
            const force = (dist - targetDist) * attraction;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
        }
    });

    // 分层引力：保持节点在各自区域
    bloodlineNodes.forEach(node => {
        let targetY = centerY;
        if (node.type === 'upstream') {
            targetY = canvas.height * 0.25;
        } else if (node.type === 'downstream') {
            targetY = canvas.height * 0.75;
        }
        
        const dy = targetY - node.y;
        node.vy += dy * 0.003;
    });

    // 更新位置并限制边界
    bloodlineNodes.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        
        // 速度限制，防止颤抖
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > maxVelocity) {
            node.vx = (node.vx / speed) * maxVelocity;
            node.vy = (node.vy / speed) * maxVelocity;
        }
        
        node.x += node.vx;
        node.y += node.vy;
        
        // 边界限制（增加边界缓冲区域）
        const margin = 50;
        node.x = Math.max(node.radius + margin, Math.min(canvas.width - node.radius - margin, node.x));
        node.y = Math.max(node.radius + margin, Math.min(canvas.height - node.radius - margin, node.y));
    });
}

// 绘制节点
function drawNode(node) {
    const ctx = bloodlineCtx;
    
    // 选中状态发光效果
    if (selectedNode === node.id) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = node.color + '30';
        ctx.fill();
    }

    // 外发光
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = node.color + '20';
    ctx.fill();

    // 节点主体
    const gradient = ctx.createRadialGradient(
        node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
        node.x, node.y, node.radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, node.color);
    gradient.addColorStop(1, adjustColor(node.color, -30));

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.strokeStyle = adjustColor(node.color, 20);
    ctx.lineWidth = 2;
    ctx.stroke();

    // 中心节点特殊标记
    if (node.type === 'center') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // 节点名称
    ctx.fillStyle = '#2d3748';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    
    const text = node.name.length > 6 ? node.name.substring(0, 6) + '...' : node.name;
    ctx.fillText(text, node.x, node.y + node.radius + 18);
}

// 绘制连线
function drawLink(link) {
    const ctx = bloodlineCtx;
    const source = bloodlineNodes.find(n => n.id === link.source);
    const target = bloodlineNodes.find(n => n.id === link.target);
    
    if (!source || !target) return;

    const isSelected = selectedNode === source.id || selectedNode === target.id;
    
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    
    // 计算控制点，创建曲线
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const perpX = -dy * 0.1;
    const perpY = dx * 0.1;
    
    ctx.quadraticCurveTo(
        midX + perpX, midY + perpY,
        target.x, target.y
    );
    
    ctx.strokeStyle = isSelected ? '#667eea' : '#cbd5e0';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 箭头
    if (link.type === 'upstream') {
        drawArrow(target.x, target.y, source.x, source.y, isSelected ? '#667eea' : '#cbd5e0');
    } else {
        drawArrow(source.x, source.y, target.x, target.y, isSelected ? '#667eea' : '#cbd5e0');
    }
}

// 绘制箭头
function drawArrow(fromX, fromY, toX, toY, color) {
    const ctx = bloodlineCtx;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 10;
    const arrowWidth = 6;
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - arrowLength * Math.cos(angle - arrowWidth / 10),
        toY - arrowLength * Math.sin(angle - arrowWidth / 10)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - arrowLength * Math.cos(angle + arrowWidth / 10),
        toY - arrowLength * Math.sin(angle + arrowWidth / 10)
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 颜色调整
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

// 动画循环
function animate() {
    const canvas = document.getElementById('bloodline-canvas');
    bloodlineCtx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景网格（不缩放）
    drawGrid();

    // 应用变换（缩放和平移）
    bloodlineCtx.save();
    bloodlineCtx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
    bloodlineCtx.scale(scale, scale);
    bloodlineCtx.translate(-canvas.width / 2, -canvas.height / 2);

    // 应用力
    applyForces();

    // 绘制连线
    bloodlineLinks.forEach(drawLink);

    // 绘制节点
    bloodlineNodes.forEach(drawNode);

    // 恢复变换
    bloodlineCtx.restore();

    animationId = requestAnimationFrame(animate);
}

// 绘制背景网格
function drawGrid() {
    const ctx = bloodlineCtx;
    const canvas = document.getElementById('bloodline-canvas');
    const gridSize = 30;
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 滚轮缩放事件
function onCanvasWheel(e) {
    e.preventDefault();
    const canvas = document.getElementById('bloodline-canvas');
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.3, Math.min(3, scale + delta));
    
    // 计算鼠标位置相对于画布中心的偏移
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 缩放时保持鼠标位置不变
    const worldX = (mouseX - canvas.width / 2 - offsetX) / scale;
    const worldY = (mouseY - canvas.height / 2 - offsetY) / scale;
    
    scale = newScale;
    offsetX = mouseX - canvas.width / 2 - worldX * scale;
    offsetY = mouseY - canvas.height / 2 - worldY * scale;
}

// 鼠标按下事件（开始拖拽）
function onCanvasMouseDown(e) {
    const canvas = document.getElementById('bloodline-canvas');
    const container = document.querySelector('.bloodline-canvas-container');
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 将鼠标坐标转换为画布坐标（考虑画布缩放）
    const canvasX = mouseX * (canvas.width / container.clientWidth);
    const canvasY = mouseY * (canvas.height / container.clientHeight);
    
    // 将画布坐标转换为世界坐标（考虑视口缩放和偏移）
    const worldX = (canvasX - canvas.width / 2 - offsetX) / scale + canvas.width / 2;
    const worldY = (canvasY - canvas.height / 2 - offsetY) / scale + canvas.height / 2;
    
    // 先检测是否点击了节点
    const clickedNode = findNodeAtPosition(worldX, worldY);
    
    if (clickedNode && e.button === 0) {
        // 左键点击节点，开始拖拽节点
        e.preventDefault();
        draggingNode = clickedNode;
        dragNodeOffsetX = worldX - clickedNode.x;
        dragNodeOffsetY = worldY - clickedNode.y;
        selectedNode = clickedNode.id;
        showNodeInfo(clickedNode);
    } else if (e.button === 1 || e.button === 0) {
        // 左键点击空白处或中键，平移画布
        e.preventDefault();
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragOffsetX = offsetX;
        dragOffsetY = offsetY;
        hasMoved = false;
    }
}

// 鼠标移动事件（拖拽）
function onCanvasDrag(e) {
    const canvas = document.getElementById('bloodline-canvas');
    const container = document.querySelector('.bloodline-canvas-container');
    const rect = canvas.getBoundingClientRect();
    
    if (draggingNode) {
        // 拖拽节点
        e.preventDefault();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 将鼠标坐标转换为画布坐标（考虑画布缩放）
        const canvasX = mouseX * (canvas.width / container.clientWidth);
        const canvasY = mouseY * (canvas.height / container.clientHeight);
        
        // 将画布坐标转换为世界坐标（考虑视口缩放和偏移）
        const worldX = (canvasX - canvas.width / 2 - offsetX) / scale + canvas.width / 2;
        const worldY = (canvasY - canvas.height / 2 - offsetY) / scale + canvas.height / 2;
        
        // 更新节点位置
        draggingNode.x = worldX - dragNodeOffsetX;
        draggingNode.y = worldY - dragNodeOffsetY;
        
        // 限制在画布内
        const margin = 50;
        draggingNode.x = Math.max(draggingNode.radius + margin, Math.min(canvas.width - draggingNode.radius - margin, draggingNode.x));
        draggingNode.y = Math.max(draggingNode.radius + margin, Math.min(canvas.height - draggingNode.radius - margin, draggingNode.y));
        
        // 重置速度，防止拖拽后节点继续移动
        draggingNode.vx = 0;
        draggingNode.vy = 0;
    } else if (isDragging) {
        // 平移画布
        e.preventDefault();
        offsetX = dragOffsetX + (e.clientX - dragStartX);
        offsetY = dragOffsetY + (e.clientY - dragStartY);
        hasMoved = true;
    }
}

// 鼠标释放事件（结束拖拽）
function onCanvasMouseUp(e) {
    draggingNode = null;
    isDragging = false;
}

// 在指定位置查找节点
function findNodeAtPosition(x, y) {
    for (let i = bloodlineNodes.length - 1; i >= 0; i--) {
        const node = bloodlineNodes[i];
        const dx = x - node.x;
        const dy = y - node.y;
        if (dx * dx + dy * dy <= node.radius * node.radius) {
            return node;
        }
    }
    return null;
}

// 画布点击事件（仅处理点击空白区域）
function onCanvasClick(e) {
    const canvas = document.getElementById('bloodline-canvas');
    const container = document.querySelector('.bloodline-canvas-container');
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 将鼠标坐标转换为画布坐标（考虑画布缩放）
    const canvasX = mouseX * (canvas.width / container.clientWidth);
    const canvasY = mouseY * (canvas.height / container.clientHeight);
    
    // 将画布坐标转换为世界坐标（考虑视口缩放和偏移）
    const worldX = (canvasX - canvas.width / 2 - offsetX) / scale + canvas.width / 2;
    const worldY = (canvasY - canvas.height / 2 - offsetY) / scale + canvas.height / 2;

    const clickedNode = findNodeAtPosition(worldX, worldY);

    if (!clickedNode) {
        selectedNode = null;
        closeInfoPanel();
    }
}

// 鼠标移动事件
function onCanvasMouseMove(e) {
    const canvas = document.getElementById('bloodline-canvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hoveredNode = false;
    for (const node of bloodlineNodes) {
        const dx = x - node.x;
        const dy = y - node.y;
        if (dx * dx + dy * dy <= node.radius * node.radius) {
            hoveredNode = true;
            break;
        }
    }
    
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
}

// 显示节点信息面板
function showNodeInfo(node) {
    const panel = document.getElementById('bloodline-info-panel');
    const content = document.getElementById('info-panel-content');
    
    let html = `
        <div class="info-row">
            <span class="info-label">名称</span>
            <span class="info-value">${node.name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">类型</span>
            <span class="info-value">${getNodeTypeName(node.type)}</span>
        </div>
    `;

    if (node.data.fields) {
        html += `
            <div class="info-fields">
                <div class="info-fields-title">包含字段</div>
                ${node.data.fields.map(field => `<span class="info-field-tag">${field}</span>`).join('')}
            </div>
        `;
    }

    if (node.data.location) {
        html += `
            <div class="info-row">
                <span class="info-label">位置</span>
                <span class="info-value">${node.data.location}</span>
            </div>
        `;
    }

    if (node.type === 'center') {
        html += `
            <div style="margin-top: 15px;">
                <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="showMetricDetail('${node.data.metricId}')">
                    查看指标详情
                </button>
            </div>
        `;
    } else {
        html += `
            <div style="margin-top: 15px;">
                <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="showDataPreview('${node.name}', '${node.data.type || '表'}')">
                    查看数据预览
                </button>
            </div>
        `;
    }

    content.innerHTML = html;
    panel.classList.add('show');
}

// 获取节点类型名称
function getNodeTypeName(type) {
    const names = {
        'center': '核心指标',
        'upstream': '上游数据源',
        'downstream': '下游应用'
    };
    return names[type] || type;
}

// 关闭信息面板
function closeInfoPanel() {
    const panel = document.getElementById('bloodline-info-panel');
    panel.classList.remove('show');
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

// 保存LLM配置（模态框版本）
function saveLLMConfigModal() {
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
    
    const title = document.getElementById('report-title').value || '运营数据分析报告';
    const reportContent = document.getElementById('report-content');
    
    reportContent.textContent = '正在调用AI生成报告，请稍候...';
    document.getElementById('report-result').style.display = 'block';
    
    fetch('/api/ai/generate_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            metric_ids: [],
            type: 'detailed',
            title: title
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            reportContent.textContent = data.report;
        } else {
            reportContent.textContent = `生成失败：${data.error || '未知错误'}\n\n请在配置页面输入有效的API密钥`;
        }
    })
    .catch(error => {
        reportContent.textContent = `生成失败：${error.message || '网络错误'}`;
    });
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
    const analysisContent = document.getElementById('analysis-content');
    
    analysisContent.textContent = '正在调用AI进行智能分析，请稍候...';
    document.getElementById('analysis-result').style.display = 'block';
    
    fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            metric_ids: [],
            type: 'detailed'
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            analysisContent.textContent = data.analysis;
        } else {
            analysisContent.textContent = `分析失败：${data.error || '未知错误'}\n\n请在配置页面输入有效的API密钥`;
        }
    })
    .catch(error => {
        analysisContent.textContent = `分析失败：${error.message || '网络错误'}`;
    });
}

// 显示指标解读
function showInterpretation() {
    const interpretationContent = document.getElementById('interpretation-content');
    
    interpretationContent.innerHTML = '<div style="text-align: center; padding: 20px;">正在调用AI解读指标，请稍候...</div>';
    document.getElementById('agent-interpretation').style.display = 'block';
    
    fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            metric_ids: [],
            type: 'summary'
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            interpretationContent.innerHTML = `
                <div class="interpretation-item">
                    <h4><i class="fas fa-lightbulb"></i> 智能指标解读</h4>
                    <p>${data.analysis}</p>
                </div>
            `;
        } else {
            interpretationContent.innerHTML = `
                <div class="interpretation-item">
                    <h4><i class="fas fa-exclamation-circle"></i> 解读失败</h4>
                    <p>${data.error || '未知错误'}</p>
                    <p style="font-size: 12px; color: #8898aa;">请在配置页面输入有效的API密钥</p>
                </div>
            `;
        }
    })
    .catch(error => {
        interpretationContent.innerHTML = `
            <div class="interpretation-item">
                <h4><i class="fas fa-exclamation-circle"></i> 网络错误</h4>
                <p>${error.message || '无法连接到服务器'}</p>
            </div>
        `;
    });
}

// 提交问题
function submitQuestion() {
    const question = document.getElementById('ask-input').value;
    if (!question.trim()) return;

    document.getElementById('ask-loading').style.display = 'block';
    document.getElementById('ask-result').style.display = 'none';
    document.getElementById('ask-error').style.display = 'none';

    fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('ask-loading').style.display = 'none';
        if (data.success) {
            document.getElementById('ask-question').textContent = question;
            document.getElementById('ask-answer').textContent = data.answer;
            document.getElementById('ask-result').style.display = 'block';
        } else {
            document.getElementById('ask-error-msg').textContent = data.error || '未知错误';
            document.getElementById('ask-error').style.display = 'block';
        }
    })
    .catch(error => {
        document.getElementById('ask-loading').style.display = 'none';
        document.getElementById('ask-error-msg').textContent = error.message || '网络错误';
        document.getElementById('ask-error').style.display = 'block';
    });
}

// 关闭弹窗
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// 显示质量检查详情
function showQualityDetail(checkId, metricId) {
    fetch('/api/quality/' + metricId)
        .then(res => res.json())
        .then(qualityData => {
            const detail = qualityData.detail || {};
            const statusClass = (qualityData.status === 'normal') ? 'quality-normal' :
                                (qualityData.status === 'warning') ? 'quality-warning' : 'quality-danger';
            const statusText = (qualityData.status === 'normal') ? '正常' :
                               (qualityData.status === 'warning') ? '警告' : '异常';

            // 检查方法
            const checkMethodsHtml = (detail.check_methods || []).map(m =>
                `<span class="quality-tag">${m}</span>`
            ).join('');

            // 历史记录
            const historyHtml = (detail.history || []).map(h => {
                const sClass = h.status === 'normal' ? 'quality-normal' :
                               h.status === 'warning' ? 'quality-warning' : 'quality-danger';
                return `
                    <tr>
                        <td>${h.date}</td>
                        <td><span class="quality-score-mini ${sClass}">${h.score}</span></td>
                        <td>${h.anomaly}</td>
                        <td><span class="status-badge ${sClass === 'quality-normal' ? 'status-authorized' : sClass === 'quality-warning' ? 'status-pending' : 'status-offline'}">${h.status === 'normal' ? '正常' : h.status === 'warning' ? '警告' : '异常'}</span></td>
                    </tr>
                `;
            }).join('');

            // 异常列表
            let anomalyHtml = '<p style="color: #5a6c7d; text-align: center; padding: 20px;">暂无异常记录</p>';
            if (detail.anomaly_list && detail.anomaly_list.length > 0) {
                anomalyHtml = `
                    <table class="detail-table">
                        <thead>
                            <tr>
                                <th>字段</th>
                                <th>异常类型</th>
                                <th>数量</th>
                                <th>占比</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detail.anomaly_list.map(a => `
                                <tr>
                                    <td><code>${a.field}</code></td>
                                    <td>${a.type}</td>
                                    <td>${a.count}</td>
                                    <td>${a.rate}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            // 阈值
            const t = detail.threshold || {};
            const thresholdHtml = `
                <div class="quality-threshold-grid">
                    <div class="quality-threshold-item">
                        <div class="quality-threshold-label">完整性阈值</div>
                        <div class="quality-threshold-value">${t.completeness || 95}%</div>
                    </div>
                    <div class="quality-threshold-item">
                        <div class="quality-threshold-label">一致性阈值</div>
                        <div class="quality-threshold-value">${t.consistency || 95}%</div>
                    </div>
                    <div class="quality-threshold-item">
                        <div class="quality-threshold-label">及时性阈值</div>
                        <div class="quality-threshold-value">${t.timeliness || 90}%</div>
                    </div>
                    <div class="quality-threshold-item">
                        <div class="quality-threshold-label">准确性阈值</div>
                        <div class="quality-threshold-value">${t.accuracy || 95}%</div>
                    </div>
                </div>
            `;

            // 当前 vs 阈值对比条
            const metricsHtml = [
                { label: '完整性', value: qualityData.completeness, threshold: t.completeness || 95 },
                { label: '一致性', value: qualityData.consistency, threshold: t.consistency || 95 },
                { label: '及时性', value: qualityData.timeliness, threshold: t.timeliness || 90 },
                { label: '准确性', value: qualityData.accuracy, threshold: t.accuracy || 95 }
            ].map(m => {
                const ok = m.value >= m.threshold;
                return `
                    <div class="quality-metric-item">
                        <div class="quality-metric-label">
                            ${m.label}
                            <span class="quality-threshold-hint">阈值 ≥ ${m.threshold}%</span>
                        </div>
                        <div class="quality-metric-bar">
                            <div class="quality-metric-fill ${ok ? 'quality-normal' : 'quality-danger'}" style="width: ${m.value}%"></div>
                            <div class="quality-metric-threshold" style="left: ${m.threshold}%"></div>
                        </div>
                        <div class="quality-metric-value">${m.value}%</div>
                    </div>
                `;
            }).join('');

            const html = `
                <div class="quality-detail-container">
                    <!-- 头部摘要 -->
                    <div class="quality-detail-header">
                        <div class="quality-detail-info">
                            <h3 style="margin: 0 0 8px 0; color: #2c3e50;">${detail.metric_name || qualityData.name || ''}</h3>
                            <div style="color: #5a6c7d; font-size: 13px;">
                                <span style="margin-right: 16px;"><i class="fas fa-fingerprint"></i> ${detail.check_id || checkId}</span>
                                <span style="margin-right: 16px;"><i class="fas fa-cog"></i> ${detail.check_type || qualityData.check_type || '-'}</span>
                                <span><i class="fas fa-clock"></i> 上次执行: ${detail.last_check_time || '-'}</span>
                            </div>
                        </div>
                        <div class="quality-score-container">
                            <div class="quality-score-circle ${statusClass}">
                                <span class="quality-score-value">${qualityData.quality_score}</span>
                                <span class="quality-score-label">分</span>
                            </div>
                            <span class="quality-status-tag ${statusClass}">${statusText}</span>
                        </div>
                    </div>

                    <!-- 当前指标 -->
                    <div class="quality-detail-section">
                        <h4 class="quality-detail-section-title"><i class="fas fa-chart-bar"></i> 维度得分</h4>
                        <div class="quality-metrics-grid">${metricsHtml}</div>
                    </div>

                    <!-- 检查配置 -->
                    <div class="quality-detail-section">
                        <h4 class="quality-detail-section-title"><i class="fas fa-cogs"></i> 检查配置</h4>
                        <div class="detail-info-grid">
                            <div class="detail-info-item" style="grid-column: 1 / -1;">
                                <div class="detail-info-label">检查方法</div>
                                <div class="detail-info-value">${checkMethodsHtml || '-'}</div>
                            </div>
                            <div class="detail-info-item" style="grid-column: 1 / -1;">
                                <div class="detail-info-label">校验规则</div>
                                <div class="detail-info-value">${detail.check_rules || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">执行频率</div>
                                <div class="detail-info-value">${detail.check_frequency || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">耗时</div>
                                <div class="detail-info-value">${detail.check_duration || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">检查数据量</div>
                                <div class="detail-info-value">${detail.data_volume || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">下次执行</div>
                                <div class="detail-info-value">${detail.next_check_time || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 阈值配置 -->
                    <div class="quality-detail-section">
                        <h4 class="quality-detail-section-title"><i class="fas fa-sliders-h"></i> 阈值配置</h4>
                        ${thresholdHtml}
                    </div>

                    <!-- 异常明细 -->
                    <div class="quality-detail-section">
                        <h4 class="quality-detail-section-title">
                            <i class="fas fa-exclamation-triangle"></i> 异常明细
                            <span class="quality-detail-count">${detail.anomaly_list ? detail.anomaly_list.length : 0} 类</span>
                        </h4>
                        ${anomalyHtml}
                    </div>

                    <!-- 历史记录 -->
                    <div class="quality-detail-section">
                        <h4 class="quality-detail-section-title"><i class="fas fa-history"></i> 最近 5 次检查</h4>
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>检查日期</th>
                                    <th>质量分</th>
                                    <th>异常数</th>
                                    <th>状态</th>
                                </tr>
                            </thead>
                            <tbody>${historyHtml}</tbody>
                        </table>
                    </div>
                </div>
            `;

            document.getElementById('quality-detail-content').innerHTML = html;
            document.getElementById('quality-detail-title').textContent = '质量检查详情 - ' + (detail.metric_name || qualityData.name || '');
            document.getElementById('quality-detail-modal').classList.add('show');
        });
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

// ==================== AI分析和BI报表功能 ====================

let currentAITab = 'insights';

function switchAITab(tab) {
    currentAITab = tab;
    
    document.querySelectorAll('.ai-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.ai-tab-panel').forEach(content => {
        content.style.display = 'none';
    });
    
    document.getElementById('ai-' + tab + '-panel').style.display = 'flex';
    
    if (tab === 'config') {
        loadLLMConfig();
    }
    
    if (tab === 'insights' && selectedMetrics.length > 0) {
        fetchAIInsights();
    }
}

function fetchAIInsights() {
    if (selectedMetrics.length === 0) return;
    
    const metricIds = selectedMetrics.map(m => m.id);
    const container = document.getElementById('ai-insights-list');
    const emptyState = document.getElementById('ai-insights-empty');
    
    container.innerHTML = '';
    emptyState.style.display = 'none';
    
    fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric_ids: metricIds })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            renderInsights(data.insights);
        } else {
            container.innerHTML = `
                <div class="ai-error" style="margin-top: 20px;">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="ai-error-content">
                        <h4>获取洞察失败</h4>
                        <p>${data.error || '未知错误'}</p>
                        <p class="ai-error-hint">请检查AI配置页面中的API密钥和模型设置</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        container.innerHTML = `
            <div class="ai-error" style="margin-top: 20px;">
                <i class="fas fa-exclamation-circle"></i>
                <div class="ai-error-content">
                    <h4>网络请求失败</h4>
                    <p>${error.message || '连接错误'}</p>
                </div>
            </div>
        `;
    });
}

function renderInsights(insights) {
    const container = document.getElementById('ai-insights-list');
    const emptyState = document.getElementById('ai-insights-empty');
    
    if (!insights || insights.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    container.innerHTML = insights.map(insight => `
        <div class="ai-insight-card ${insight.insight_type}">
            <div class="ai-insight-header">
                <span class="ai-insight-name">${insight.metric_name}</span>
                <span class="ai-insight-type ${insight.insight_type}">
                    ${insight.insight_type === 'alert' ? '预警' : insight.insight_type === 'trend' ? '趋势' : '正常'}
                </span>
            </div>
            <div class="ai-insight-content">${insight.insight}</div>
            <div class="ai-insight-recommendation">${insight.recommendation}</div>
        </div>
    `).join('');
}

function runAIAnalysis() {
    if (selectedMetrics.length === 0) return;
    
    const metricIds = selectedMetrics.map(m => m.id);
    const analysisType = document.getElementById('analysis-type').value;
    const resultContainer = document.getElementById('ai-analysis-result');
    
    resultContainer.innerHTML = `
        <div class="ai-loading">
            <div class="ai-loading-spinner"></div>
            <div class="ai-loading-text">AI正在分析数据...</div>
        </div>
    `;
    
    fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            metric_ids: metricIds,
            type: analysisType
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            resultContainer.innerHTML = `
                <div class="markdown-content">
                    ${convertMarkdownToHtml(data.analysis)}
                </div>
                <div class="ai-model-info">
                    使用模型: ${data.model_used || '未知'}
                </div>
            `;
        } else {
            resultContainer.innerHTML = `
                <div class="ai-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="ai-error-content">
                        <h4>分析失败</h4>
                        <p>${data.error || '未知错误'}</p>
                        <p class="ai-error-hint">请检查AI配置页面中的API密钥和模型设置</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        resultContainer.innerHTML = `
            <div class="ai-error">
                <i class="fas fa-exclamation-circle"></i>
                <div class="ai-error-content">
                    <h4>网络请求失败</h4>
                    <p>${error.message || '连接错误'}</p>
                </div>
            </div>
        `;
    });
}

function generateBIReport() {
    if (selectedMetrics.length === 0) return;
    
    const metricIds = selectedMetrics.map(m => m.id);
    const reportType = document.getElementById('report-type').value;
    const title = document.getElementById('report-title-input').value || '指标分析报告';
    const resultContainer = document.getElementById('ai-report-result');
    
    resultContainer.innerHTML = `
        <div class="ai-loading">
            <div class="ai-loading-spinner"></div>
            <div class="ai-loading-text">正在生成BI报表...</div>
        </div>
    `;
    
    fetch('/api/ai/generate_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            metric_ids: metricIds,
            type: reportType,
            title: title
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            resultContainer.innerHTML = `
                <div class="markdown-content">
                    <h1>${data.title}</h1>
                    ${convertMarkdownToHtml(data.report)}
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; font-size: 11px; color: #8898aa;">
                        生成时间: ${data.timestamp} | 使用模型: ${data.model_used || '未知'}
                    </div>
                </div>
            `;
        } else {
            resultContainer.innerHTML = `
                <div class="ai-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="ai-error-content">
                        <h4>报表生成失败</h4>
                        <p>${data.error || '未知错误'}</p>
                        <p class="ai-error-hint">请检查AI配置页面中的API密钥和模型设置</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        resultContainer.innerHTML = `
            <div class="ai-error">
                <i class="fas fa-exclamation-circle"></i>
                <div class="ai-error-content">
                    <h4>网络请求失败</h4>
                    <p>${error.message || '连接错误'}</p>
                </div>
            </div>
        `;
    });
}

function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\n<ul>/g, '');
    
    html = html.replace(/\|(.*)\|/g, function(match) {
        const parts = match.split('|').filter(p => p.trim());
        if (parts.length > 0) {
            if (parts[0].includes('---')) {
                return '';
            }
            return '<tr>' + parts.map(p => '<td>' + p.trim() + '</td>').join('') + '</tr>';
        }
        return match;
    });
    
    html = html.replace(/(<tr>.*<\/tr>)/gim, '<table>$1</table>');
    html = html.replace(/<\/table>\n<table>/g, '');
    
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// ==================== LLM配置管理 ====================
let llmProviders = {};

function getElement(id) {
    const el = document.getElementById(id);
    return el || null;
}

function toggleLLMEnabled() {
    const enabled = document.getElementById('llm-enabled').checked;
    const configForm = document.querySelector('.config-form');
    const inputs = configForm.querySelectorAll('.form-input, .form-select');
    
    inputs.forEach(input => {
        input.disabled = !enabled;
    });
}

function onProviderChange() {
    const provider = document.getElementById('llm-provider').value;
    
    const secretGroup = document.getElementById('llm-api-secret-group');
    const baseUrlGroup = document.getElementById('llm-base-url-group');
    const modelSelect = document.getElementById('llm-model');
    const baseUrlInput = document.getElementById('llm-base-url');
    
    if (provider === 'spark') {
        secretGroup.style.display = 'flex';
    } else {
        secretGroup.style.display = 'none';
    }
    
    if (provider === 'custom') {
        baseUrlGroup.style.display = 'flex';
        baseUrlInput.required = true;
    } else {
        baseUrlGroup.style.display = 'flex';
        baseUrlInput.required = false;
    }
    
    if (llmProviders[provider]) {
        const info = llmProviders[provider];
        if (info.base_url) {
            baseUrlInput.value = info.base_url;
        }
        if (info.models && info.models.length > 0) {
            modelSelect.innerHTML = info.models.map(model => 
                `<option value="${model}">${model}</option>`
            ).join('');
        }
    }
}

function togglePassword(fieldId) {
    const input = document.getElementById(fieldId);
    const btn = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

let currentConfigKey = 'default';

function loadLLMConfig() {
    fetch('/api/llm/config')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                llmProviders = data.providers || {};
                
                const configs = data.configs || {};
                const activeKey = data.active_config || 'default';
                const config = data.current_config || {};
                
                currentConfigKey = activeKey;
                
                const select = document.getElementById('llm-config-select');
                select.innerHTML = '<option value="">选择配置...</option>';
                for (const [key, cfg] of Object.entries(configs)) {
                    const selected = key === activeKey ? 'selected' : '';
                    select.innerHTML += `<option value="${key}" ${selected}>${cfg.name || key}</option>`;
                }
                
                document.getElementById('llm-config-name').value = config.name || '';
                document.getElementById('llm-enabled').checked = config.enabled || false;
                document.getElementById('llm-provider').value = config.api_type || 'openai';
                document.getElementById('llm-api-key').value = config.api_key || '';
                document.getElementById('llm-api-secret').value = config.api_secret || '';
                document.getElementById('llm-base-url').value = config.base_url || '';
                document.getElementById('llm-model').value = config.model || 'gpt-4o-mini';
                document.getElementById('llm-max-tokens').value = config.max_tokens || 2000;
                document.getElementById('llm-temperature').value = config.temperature || 0.7;
                
                toggleLLMEnabled();
                onProviderChange();
                updateDeleteButton();
                
                showConfigStatus('info', '配置已加载');
            }
        })
        .catch(error => {
            showConfigStatus('error', '加载配置失败: ' + error.message);
        });
}

function onConfigSelectChange() {
    const select = document.getElementById('llm-config-select');
    const key = select.value;
    
    if (!key) return;
    
    fetch('/api/llm/config')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const configs = data.configs || {};
                const config = configs[key] || {};
                
                currentConfigKey = key;
                
                document.getElementById('llm-config-name').value = config.name || '';
                document.getElementById('llm-enabled').checked = config.enabled || false;
                document.getElementById('llm-provider').value = config.api_type || 'openai';
                document.getElementById('llm-api-key').value = config.api_key || '';
                document.getElementById('llm-api-secret').value = config.api_secret || '';
                document.getElementById('llm-base-url').value = config.base_url || '';
                document.getElementById('llm-model').value = config.model || 'gpt-4o-mini';
                document.getElementById('llm-max-tokens').value = config.max_tokens || 2000;
                document.getElementById('llm-temperature').value = config.temperature || 0.7;
                
                toggleLLMEnabled();
                onProviderChange();
                updateDeleteButton();
            }
        });
}

function updateDeleteButton() {
    const btn = document.getElementById('btn-delete-config');
    if (currentConfigKey && currentConfigKey !== 'default') {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

function addNewConfig() {
    const name = prompt('请输入新配置名称:', '新配置');
    if (!name) return;
    
    fetch('/api/llm/config/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            enabled: true,
            api_type: 'openai',
            api_key: '',
            base_url: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.7
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadLLMConfig();
            showConfigStatus('success', '新配置已添加');
        } else {
            showConfigStatus('error', data.error || '添加失败');
        }
    });
}

function deleteCurrentConfig() {
    if (!currentConfigKey || currentConfigKey === 'default') return;
    
    if (!confirm('确定要删除当前配置吗？')) return;
    
    fetch('/api/llm/config/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_key: currentConfigKey })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadLLMConfig();
            showConfigStatus('success', '配置已删除');
        } else {
            showConfigStatus('error', data.error || '删除失败');
        }
    });
}

function saveLLMConfig() {
    try {
        const nameEl = getElement('llm-config-name');
        const enabledEl = getElement('llm-enabled');
        const providerEl = getElement('llm-provider');
        const apiKeyEl = getElement('llm-api-key');
        const apiSecretEl = getElement('llm-api-secret');
        const baseUrlEl = getElement('llm-base-url');
        const modelEl = getElement('llm-model');
        const maxTokensEl = getElement('llm-max-tokens');
        const temperatureEl = getElement('llm-temperature');
        
        if (!enabledEl || !providerEl || !apiKeyEl) {
            console.error('LLM配置表单元素缺失');
            showConfigStatus('error', '表单元素缺失，请刷新页面');
            return;
        }
        
        const config = {
            config_key: currentConfigKey,
            name: nameEl ? nameEl.value.trim() || '配置' + currentConfigKey : '配置' + currentConfigKey,
            enabled: enabledEl.checked,
            api_type: providerEl.value,
            api_key: apiKeyEl.value,
            api_secret: apiSecretEl ? apiSecretEl.value : '',
            base_url: baseUrlEl ? baseUrlEl.value : '',
            model: modelEl ? modelEl.value : '',
            max_tokens: maxTokensEl ? parseInt(maxTokensEl.value) : 2000,
            temperature: temperatureEl ? parseFloat(temperatureEl.value) : 0.7
        };
        
        console.log('保存LLM配置:', config);
        
        fetch('/api/llm/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        })
        .then(res => {
            if (!res.ok) {
                throw new Error('HTTP error ' + res.status);
            }
            return res.json();
        })
        .then(data => {
            console.log('保存结果:', data);
            if (data.success) {
                showConfigStatus('success', data.message);
            } else {
                showConfigStatus('error', data.message || '保存失败');
            }
        })
        .catch(error => {
            console.error('保存配置失败:', error);
            showConfigStatus('error', '保存配置失败: ' + error.message);
        });
    } catch (e) {
        console.error('saveLLMConfig异常:', e);
        showConfigStatus('error', '保存配置异常: ' + e.message);
    }
}

function testLLMConnection() {
    const config = {
        enabled: document.getElementById('llm-enabled').checked,
        api_type: document.getElementById('llm-provider').value,
        api_key: document.getElementById('llm-api-key').value,
        api_secret: document.getElementById('llm-api-secret').value,
        base_url: document.getElementById('llm-base-url').value,
        model: document.getElementById('llm-model').value
    };
    
    if (!config.api_key) {
        showConfigStatus('error', '请先输入API密钥');
        return;
    }
    
    showConfigStatus('info', '正在测试连接...');
    
    fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showConfigStatus('success', data.message + ' - ' + data.response);
        } else {
            showConfigStatus('error', data.message);
        }
    })
    .catch(error => {
        showConfigStatus('error', '测试连接失败: ' + error.message);
    });
}

function showConfigStatus(type, message) {
    const statusEl = document.getElementById('config-status');
    const iconEl = document.getElementById('status-icon');
    const msgEl = document.getElementById('status-message');
    
    statusEl.className = 'config-status ' + type;
    
    const icons = {
        success: '<i class="fas fa-check"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    iconEl.innerHTML = icons[type];
    msgEl.textContent = message;
    statusEl.style.display = 'flex';
    
    setTimeout(() => {
        if (type === 'success') {
            statusEl.style.display = 'none';
        }
    }, 5000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 默认显示管理驾驶舱
    showPage('dashboard');
});

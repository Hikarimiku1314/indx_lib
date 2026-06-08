from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
import os
import requests
from datetime import datetime

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# ==================== 大模型API配置 ====================
LLM_CONFIG = {
    "enabled": False,  # 是否启用真实大模型API
    "api_type": "openai",  # 可选: openai / claude / zhipu / siliconflow
    "api_key": os.environ.get("LLM_API_KEY", ""),
    "base_url": os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1"),
    "model": os.environ.get("LLM_MODEL", "gpt-4o-mini"),
    "model_size": "small",  # 模型规模: small (小模型) / large (大模型)
    "max_tokens": 2000,
    "temperature": 0.7
}

# ==================== 模拟AI响应 ====================
MOCK_AI_RESPONSES = {
    "ask": [
        "根据提供的指标数据，当前业务整体表现良好。北极星指标综合盈利指数为87.5%，同比提升2.3个百分点。主要受益于净利息收入和中间业务收入的快速增长。",
        "从指标数据来看，净利润率保持在15.2%，ROE为12.8%，整体盈利能力稳健。建议持续优化成本收入比，进一步提升效率。",
        "当前不良贷款率为1.8%，风险可控。拨备覆盖率和流动性指标表现良好，整体风险可控。"
    ],
    "analyze": "## 整体指标分析报告\n\n### 一、核心指标表现\n- **综合盈利指数**: 87.5% (同比+2.3%)\n- **客户满意度**: 92.1% (同比+1.5%)\n\n### 二、主要发现\n1. 盈利能力稳步提升，盈利能力指标整体向好\n2. 风险指标保持在合理区间\n3. 流动性指标表现优秀\n\n### 三、建议\n- 继续优化成本收入比\n- 加强中间业务发展\n- 持续关注风险指标变化",
    "report": """# 金融指标分析报告\n\n## 一、执行摘要\n本次报告基于当前指标数据进行全面分析。\n\n## 二、核心指标\n\n### 2.1 北极星指标\n- **综合盈利指数**: 87.5%\n- **客户满意度**: 92.1%\n- **风险控制指数**: 78.3%\n\n### 2.2 财务指标\n- 净利润率: 15.2%\n- ROE: 12.8%\n- 不良贷款率: 1.8%\n\n## 三、分析与洞察\n\n1. **盈利能力**: 整体表现良好，各项盈利指标稳健增长\n2. **风险控制**: 不良贷款率处于可控区间\n3. **流动性**: 流动性比率58.6%，表现优秀\n\n## 四、建议措施\n\n- 持续优化成本结构\n- 加强中间业务发展\n- 定期监控风险指标变化"""
}

# 数据文件路径
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'mock_data.json')

# 加载数据
def load_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# 保存数据
def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 全局数据缓存
data = load_data()

# 动态获取数据的函数
def get_north_star_metrics():
    return data.get('north_star_metrics', [])

def get_metric_tree():
    return data.get('metric_tree', {})

def get_metrics_list():
    return data.get('metrics_list', [])

def get_metric_details():
    return data.get('metric_details', {})

def get_market_metrics():
    return data.get('market_metrics', [])

def get_bloodline_data():
    return data.get('bloodline_data', {})

def generate_mock_table_data(table_name):
    """生成模拟的表数据用于预览"""
    # 根据表名生成不同的列和数据
    if '财务' in table_name or '收入' in table_name:
        columns = ['日期', '收入金额', '成本', '利润', '利润率', '部门']
        rows = []
        for i in range(10):
            income = 1000000 + i * 50000
            cost = income * 0.75
            profit = income - cost
            rows.append({
                '日期': f'2024-06-{(i+1):02d}',
                '收入金额': f'{income:,.2f}',
                '成本': f'{cost:,.2f}',
                '利润': f'{profit:,.2f}',
                '利润率': f'{profit/income*100:.2f}%',
                '部门': ['财务部', '营业部', '公司部'][i % 3]
            })
    elif '客户' in table_name:
        columns = ['客户ID', '客户名称', '行业', '资产规模', '信用等级', '开户日期']
        rows = []
        for i in range(10):
            rows.append({
                '客户ID': f'C{1000+i}',
                '客户名称': f'客户{i+1}有限公司',
                '行业': ['制造业', '金融业', '服务业'][i % 3],
                '资产规模': f'{(i+1)*1000}万',
                '信用等级': ['AAA', 'AA', 'A', 'BBB'][i % 4],
                '开户日期': f'2020-{(i%12)+1:02d}-15'
            })
    elif '风险' in table_name:
        columns = ['指标名称', '当前值', '阈值', '状态', '更新时间']
        rows = [
            {'指标名称': '不良贷款率', '当前值': '1.8%', '阈值': '2.0%', '状态': '正常', '更新时间': '2024-06-08'},
            {'指标名称': '拨备覆盖率', '当前值': '185%', '阈值': '150%', '状态': '良好', '更新时间': '2024-06-08'},
            {'指标名称': '流动性比率', '当前值': '45%', '阈值': '30%', '状态': '良好', '更新时间': '2024-06-08'},
            {'指标名称': '资本充足率', '当前值': '12.5%', '阈值': '10.5%', '状态': '正常', '更新时间': '2024-06-08'}
        ]
    else:
        # 通用表结构
        columns = ['ID', '名称', '值', '状态', '更新时间']
        rows = []
        for i in range(10):
            rows.append({
                'ID': f'{i+1}',
                '名称': f'{table_name}_数据_{i+1}',
                '值': f'{(i+1)*100}',
                '状态': ['正常', '异常', '待处理'][i % 3],
                '更新时间': f'2024-06-{(i%30)+1:02d}'
            })
    
    return {
        'table_name': table_name,
        'columns': columns,
        'rows': rows,
        'total': len(rows)
    }

def get_alert_rules():
    return data.get('alert_rules', [])

def get_quality_checks():
    return data.get("quality_checks", [])

def get_metric(metric_id):
    # 先从 metrics_list 中查找
    metrics_list = get_metrics_list()
    metric = next((m for m in metrics_list if m["id"] == metric_id), None)
    if metric:
        # 如果找到了，补充 name 字段
        details = get_metric_details()
        if metric_id in details:
            metric["name"] = details[metric_id]["name"]
        return metric
    
    # 再从 metric_details 中查找
    details = get_metric_details()
    if metric_id in details:
        return details[metric_id]
    
    # 最后从 market_metrics 中查找
    market_metrics = get_market_metrics()
    market_metric = next((m for m in market_metrics if m["id"] == metric_id), None)
    if market_metric:
        return market_metric
    
    return None

# ==================== 大模型API调用 ====================
def call_llm(messages, config=None):
    """
    调用大模型API
    messages: [{"role": "system/user/assistant", "content": "..."}]
    返回: 模型响应文本
    """
    if config is None:
        config = LLM_CONFIG

    # 如果没有启用真实大模型API，使用模拟响应
    if not config.get("enabled", False):
        import random
        import time
        time.sleep(1.5)  # 模拟延迟
        return random.choice(MOCK_AI_RESPONSES["ask"]), None

    if not config.get("api_key"):
        return None, "API密钥未配置，请设置环境变量 LLM_API_KEY"

    api_type = config.get("api_type", "openai")

    try:
        if api_type == "openai":
            return call_openai_api(messages, config)
        elif api_type == "claude":
            return call_claude_api(messages, config)
        elif api_type == "zhipu":
            return call_zhipu_api(messages, config)
        elif api_type == "siliconflow":
            return call_siliconflow_api(messages, config)
        else:
            return None, f"不支持的API类型: {api_type}"
    except Exception as e:
        return None, f"API调用失败: {str(e)}"


def call_openai_api(messages, config):
    """调用OpenAI兼容API"""
    url = f"{config['base_url'].rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}"
    }
    payload = {
        "model": config.get("model", "gpt-4o-mini"),
        "messages": messages,
        "max_tokens": config.get("max_tokens", 2000),
        "temperature": config.get("temperature", 0.7)
    }
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def call_claude_api(messages, config):
    """调用Claude API"""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": config["api_key"],
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
    }
    # 转换消息格式
    system_msg = ""
    converted_messages = []
    for msg in messages:
        if msg["role"] == "system":
            system_msg = msg["content"]
        else:
            converted_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    payload = {
        "model": config.get("model", "claude-3-5-sonnet-latest"),
        "max_tokens": config.get("max_tokens", 2000),
        "messages": converted_messages
    }
    if system_msg:
        payload["system"] = system_msg
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["content"][0]["text"], None


def call_zhipu_api(messages, config):
    """调用智谱AI API"""
    url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}"
    }
    payload = {
        "model": config.get("model", "glm-4-flash"),
        "messages": messages,
        "max_tokens": config.get("max_tokens", 2000),
        "temperature": config.get("temperature", 0.7)
    }
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def call_siliconflow_api(messages, config):
    """调用SiliconFlow API (兼容OpenAI格式)"""
    url = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}"
    }
    payload = {
        "model": config.get("model", "Qwen/Qwen2.5-7B-Instruct"),
        "messages": messages,
        "max_tokens": config.get("max_tokens", 2000),
        "temperature": config.get("temperature", 0.7)
    }
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def build_metric_context():
    """构建指标数据的上下文信息"""
    metrics = get_metrics_list()
    details = get_metric_details()
    north_star = get_north_star_metrics()

    context = "【北极星指标】\n"
    for m in north_star:
        context += f"- {m['name']}: {m['value']}{m['unit']} (同比{'+' if m['trend'] >= 0 else ''}{m['trend']}%)\n"

    context += "\n【指标列表】\n"
    for m in metrics:
        detail = details.get(m['id'], {})
        context += f"- {m['name']} ({m['type']}): 当前值={detail.get('business_caliber', 'N/A')}, 状态={m['status']}, 负责人={m['owner']}, 周期={m['cycle']}\n"

    return context


# ==================== 路由定义 ====================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/north_star')
def api_north_star():
    return jsonify(get_north_star_metrics())

@app.route('/api/metric_tree')
def api_metric_tree():
    return jsonify(get_metric_tree())

@app.route('/api/metrics')
def api_metrics():
    return jsonify(get_metrics_list())

@app.route('/api/metric/<metric_id>')
def api_metric_detail(metric_id):
    details = get_metric_details()
    return jsonify(details.get(metric_id, {}))

@app.route('/api/market')
def api_market():
    return jsonify(get_market_metrics())

@app.route('/api/metric/trend/<metric_id>')
def api_metric_trend(metric_id):
    """获取指标趋势数据"""
    import random
    from datetime import datetime, timedelta

    # 市场指标的基础值映射
    base_values = {
        'mk001': 5.2,    # 客户流失率
        'mk002': 8.5,    # 产品收益率
        'mk003': 12.3,   # 渠道转化率
        'mk004': 85,      # 风控评分
        'mk005': 92,     # 营销效果
        'mk006': 45.6,   # 资金流动性
        'mk007': 78,     # 合规指标
        'mk008': 88,     # 员工绩效
        'mk009': 15.2,   # 净利润率
        'mk010': 12.8,   # ROE
        'mk011': 8.5,    # ROA
        'mk012': 1.8,    # 不良贷款率
        'mk013': 58.6,   # 流动性比率
        'mk014': 35.2,   # 成本收入比
        'mk015': 50000000000,  # 总资产（500亿）
        'mk016': 20000000000,  # 净资产（200亿）
        'mk017': 8000000000,   # 营业收入（80亿）
        'mk018': 1200000000,   # 净利润（12亿）
        'mk019': 60.0,   # 资产负债率
        'mk020': 180.0   # 流动比率
    }

    base_value = base_values.get(metric_id, 50)
    trend_data = []
    now = datetime.now()

    # 生成近7天的数据
    for i in range(6, -1, -1):
        date = now - timedelta(days=i)
        variation = (random.random() - 0.5) * base_value * 0.15
        value = round(base_value + variation, 2)
        trend_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'value': value
        })
        base_value = value

    return jsonify({
        'metricId': metric_id,
        'data': trend_data
    })

@app.route('/api/bloodline/<metric_id>')
def api_bloodline(metric_id):
    bloodline = get_bloodline_data()
    if metric_id == 'all':
        return jsonify(bloodline)
    return jsonify(bloodline.get(metric_id, {}))

@app.route('/api/alerts')
def api_alerts():
    return jsonify(get_alert_rules())

@app.route('/api/quality')
def api_quality():
    return jsonify(get_quality_checks())

@app.route('/api/quality/<metric_id>')
def api_quality_by_metric(metric_id):
    quality_checks = get_quality_checks()
    # 根据指标ID获取对应的质量数据
    metric = get_metric(metric_id)
    if metric:
        # 查找匹配的质量检查数据（通过名称匹配）
        quality_data = next((qc for qc in quality_checks if qc['name'] == metric.get('name')), None)
        if quality_data:
            return jsonify(quality_data)
    
    # 对于市场指标，如果没有找到，尝试通过 metric_id 匹配（如果市场指标有 metric_id 字段）
    market_metrics = get_market_metrics()
    market_metric = next((m for m in market_metrics if m["id"] == metric_id), None)
    if market_metric:
        # 如果有 metric_id 字段，尝试查找关联指标的质量数据
        if 'metric_id' in market_metric:
            related_metric = get_metric(market_metric['metric_id'])
            if related_metric:
                quality_data = next((qc for qc in quality_checks if qc['name'] == related_metric.get('name')), None)
                if quality_data:
                    return jsonify(quality_data)
        # 否则尝试直接用市场指标的名称匹配
        quality_data = next((qc for qc in quality_checks if qc['name'] == market_metric.get('name')), None)
        if quality_data:
            return jsonify(quality_data)
    
    # 如果都没有找到匹配的数据，返回默认数据
    return jsonify({
        "id": "qc_" + metric_id,
        "name": metric.get("name", "未知指标") if metric else "未知指标",
        "check_type": "数据质量综合检查",
        "anomaly_count": 0,
        "quality_score": 95,
        "status": "normal",
        "completeness": 95.0,
        "consistency": 95.0,
        "timeliness": 95.0,
        "accuracy": 95.0
    })

@app.route('/api/table_data/<table_name>')
def api_table_data(table_name):
    """获取表数据用于预览"""
    # 根据表名生成模拟数据
    table_data = generate_mock_table_data(table_name)
    return jsonify(table_data)

@app.route('/api/add_metric', methods=['POST'])
def api_add_metric():
    req_data = request.json
    metrics_list = get_metrics_list()
    new_id = f"m{len(metrics_list) + 1:03d}"
    new_metric = {
        "id": new_id,
        "name": req_data.get("name", ""),
        "type": req_data.get("type", "原子"),
        "status": "审批中",
        "owner": req_data.get("owner", ""),
        "cycle": req_data.get("cycle", "月度"),
        "create_time": "2024-01-15"
    }
    metrics_list.append(new_metric)
    data['metrics_list'] = metrics_list
    save_data(data)
    return jsonify({"success": True, "metric": new_metric})

@app.route('/api/toggle_status/<metric_id>', methods=['POST'])
def api_toggle_status(metric_id):
    metrics_list = get_metrics_list()
    for metric in metrics_list:
        if metric['id'] == metric_id:
            if metric['status'] == '已发布':
                metric['status'] = '已下线'
            elif metric['status'] == '已下线':
                metric['status'] = '审批中'
            data['metrics_list'] = metrics_list
            save_data(data)
            return jsonify({"success": True, "status": metric['status']})
    return jsonify({"success": False})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

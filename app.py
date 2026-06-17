from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
import os
import requests
import hmac
from datetime import datetime

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# ==================== 大模型API配置 ====================
LLM_CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config', 'llm_config.json')

DEFAULT_LLM_CONFIG = {
    "enabled": True,
    "api_type": os.environ.get("LLM_API_TYPE", "openai"),
    "api_key": os.environ.get("LLM_API_KEY", ""),
    "base_url": os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1"),
    "model": os.environ.get("LLM_MODEL", "gpt-4o-mini"),
    "model_size": "small",
    "max_tokens": 2000,
    "temperature": 0.7,
    "timeout": 60
}

DEFAULT_LLM_CONFIGS = {
    "active_config": "default",
    "configs": {
        "default": {
            "name": "默认配置",
            "enabled": True,
            "api_type": "openai",
            "api_key": "",
            "api_secret": "",
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o-mini",
            "model_size": "small",
            "max_tokens": 2000,
            "temperature": 0.7,
            "timeout": 60
        }
    }
}

def load_llm_config():
    if os.path.exists(LLM_CONFIG_FILE):
        try:
            with open(LLM_CONFIG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'configs' in data:
                    return data
                else:
                    configs = DEFAULT_LLM_CONFIGS.copy()
                    configs['active_config'] = 'default'
                    configs['configs']['default'] = {
                        "name": "默认配置",
                        **data
                    }
                    return configs
        except:
            return DEFAULT_LLM_CONFIGS.copy()
    return DEFAULT_LLM_CONFIGS.copy()

def save_llm_config(config_data):
    os.makedirs(os.path.dirname(LLM_CONFIG_FILE), exist_ok=True)
    with open(LLM_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, ensure_ascii=False, indent=2)
    return config_data

def get_active_llm_config():
    config_data = load_llm_config()
    active_key = config_data.get('active_config', 'default')
    return config_data['configs'].get(active_key, DEFAULT_LLM_CONFIG.copy())

LLM_CONFIG = load_llm_config()

SUPPORTED_LLM_PROVIDERS = {
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-4", "gpt-3.5-turbo"],
        "requires_api_key": True,
        "requires_api_secret": False,
        "compatible": True
    },
    "claude": {
        "name": "Anthropic Claude",
        "base_url": "https://api.anthropic.com/v1",
        "models": ["claude-3-5-sonnet-latest", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
        "requires_api_key": True,
        "requires_api_secret": False,
        "compatible": False
    },
    "zhipu": {
        "name": "智谱AI",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4-flash", "glm-4", "glm-3-turbo"],
        "requires_api_key": True,
        "requires_api_secret": False,
        "compatible": True
    },
    "qwen": {
        "name": "阿里通义千问",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": ["qwen-plus", "qwen2-7b-chat", "qwen2-14b-chat"],
        "requires_api_key": True,
        "requires_api_secret": False,
        "compatible": True
    },
    "deepseek": {
        "name": "深度求索",
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-coder"],
        "requires_api_key": True,
        "requires_api_secret": False,
        "compatible": True
    },
    "siliconflow": {
        "name": "SiliconFlow",
        "base_url": "https://api.siliconflow.cn/v1",
        "models": ["Qwen/Qwen2.5-7B-Instruct", "Qwen/Qwen2.5-14B-Instruct", "Llama-3.3-70B-Instruct"],
        "requires_api_key": True,
        "requires_api_secret": False,
        "compatible": True
    },
    "spark": {
        "name": "讯飞星火",
        "base_url": "https://spark-api.xf-yun.com/v4.0",
        "models": ["spark-4.0", "spark-3.5"],
        "requires_api_key": True,
        "requires_api_secret": True,
        "compatible": False
    },
    "custom": {
        "name": "自定义API",
        "base_url": "",
        "models": [],
        "requires_api_key": True,
        "requires_api_secret": False,
        "compatible": True
    }
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
        config = get_active_llm_config()

    enabled = config.get("enabled", False)
    api_key = config.get("api_key", "").strip()
    
    if not enabled and not api_key:
        return None, "LLM未启用且未配置API密钥，请在配置页面启用并输入API密钥"

    if not api_key:
        return None, "API密钥未配置，请在配置页面输入有效的API密钥"

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
        elif api_type == "spark":
            return call_spark_api(messages, config)
        elif api_type == "deepseek":
            return call_deepseek_api(messages, config)
        elif api_type == "qwen":
            return call_qwen_api(messages, config)
        elif api_type == "custom":
            return call_custom_api(messages, config)
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
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
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
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
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
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
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
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def call_spark_api(messages, config):
    """调用讯飞星火API"""
    import base64
    import hashlib
    import time
    
    url = config.get("base_url", "https://spark-api.xf-yun.com/v4.0/chat/completions")
    api_key = config["api_key"]
    api_secret = os.environ.get("SPARK_API_SECRET", "")
    
    if not api_secret:
        return None, "讯飞星火需要配置 SPARK_API_SECRET 环境变量"
    
    host = "spark-api.xf-yun.com"
    date = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime())
    
    signature_origin = f"host: {host}\ndate: {date}\nGET /v4.0/chat/completions HTTP/1.1"
    signature_sha = hmac.new(api_secret.encode('utf-8'), signature_origin.encode('utf-8'), hashlib.sha256).digest()
    signature = base64.b64encode(signature_sha).decode(encoding='utf-8')
    
    authorization_origin = f'api_key="{api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"'
    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": authorization,
        "host": host,
        "date": date
    }
    
    payload = {
        "model": config.get("model", "spark-4.0"),
        "messages": messages,
        "max_tokens": config.get("max_tokens", 2000),
        "temperature": config.get("temperature", 0.7)
    }
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def call_deepseek_api(messages, config):
    """调用深度求索DeepSeek API (兼容OpenAI格式)"""
    url = "https://api.deepseek.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}"
    }
    payload = {
        "model": config.get("model", "deepseek-chat"),
        "messages": messages,
        "max_tokens": config.get("max_tokens", 2000),
        "temperature": config.get("temperature", 0.7)
    }
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def call_qwen_api(messages, config):
    """调用阿里通义千问API (兼容OpenAI格式)"""
    url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}"
    }
    payload = {
        "model": config.get("model", "qwen-plus"),
        "messages": messages,
        "max_tokens": config.get("max_tokens", 2000),
        "temperature": config.get("temperature", 0.7)
    }
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def call_custom_api(messages, config):
    """调用自定义OpenAI兼容API"""
    base_url = config.get("base_url", "").rstrip('/')
    if not base_url:
        return None, "自定义API未配置base_url"
    
    url = f"{base_url}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['api_key']}"
    }
    payload = {
        "model": config.get("model", "default"),
        "messages": messages,
        "max_tokens": config.get("max_tokens", 2000),
        "temperature": config.get("temperature", 0.7)
    }
    timeout = config.get("timeout", 60)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    if response.status_code != 200:
        return None, f"API返回错误: {response.status_code} - {response.text}"
    result = response.json()
    return result["choices"][0]["message"]["content"], None


def build_metric_context():
    """构建指标数据的上下文信息"""
    metrics = get_metrics_list()
    details = get_metric_details()

    context = "【指标列表】\n"
    for m in metrics:
        detail = details.get(m['id'], {})
        context += f"- {m['name']} ({m['type']}): 当前值={detail.get('business_caliber', 'N/A')}, 状态={m['status']}, 负责人={m['owner']}, 周期={m['cycle']}\n"

    return context


# ==================== 路由定义 ====================
@app.route('/')
def index():
    return render_template('index.html')

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
        "accuracy": 95.0,
        "detail": {
            "check_id": "qc_" + metric_id,
            "metric_id": metric_id,
            "metric_name": metric.get("name", "未知指标") if metric else "未知指标",
            "check_type": "数据质量综合检查",
            "quality_score": 95,
            "status": "normal",
            "anomaly_count": 0,
            "completeness": 95.0,
            "consistency": 95.0,
            "timeliness": 95.0,
            "accuracy": 95.0,
            "check_methods": ["空值校验", "值域校验", "唯一性校验"],
            "check_rules": "基于业务规则的标准质量校验流程",
            "check_frequency": "每日凌晨 02:00 全量执行",
            "last_check_time": "2024-01-15 02:00:00",
            "next_check_time": "2024-01-16 02:00:00",
            "check_duration": "约 2 分 30 秒",
            "data_volume": "约 1,000,000 条",
            "threshold": {
                "completeness": 95.0,
                "consistency": 95.0,
                "timeliness": 90.0,
                "accuracy": 95.0
            },
            "history": [
                {'date': '2024-01-15', 'score': 95, 'anomaly': 0, 'status': 'normal'},
                {'date': '2024-01-14', 'score': 95, 'anomaly': 0, 'status': 'normal'},
                {'date': '2024-01-13', 'score': 95, 'anomaly': 0, 'status': 'normal'}
            ]
        }
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
        "type": req_data.get("type", "原子指标"),
        "status": "审批中",
        "owner": req_data.get("owner", ""),
        "cycle": req_data.get("cycle", "月度"),
        "create_time": "2024-01-15",
        # 业务属性
        "dimension": req_data.get("dimension", ""),
        "department": req_data.get("department", ""),
        "business_caliber": req_data.get("business_caliber", ""),
        # 技术属性
        "bloodline": req_data.get("bloodline", ""),
        # 管理属性
        "alias": req_data.get("alias", ""),
        "measure": req_data.get("measure", ""),
        "unit": req_data.get("unit", ""),
        "currency": req_data.get("currency", ""),
        "source": req_data.get("source", ""),
        "processing": req_data.get("processing", ""),
        "parent": req_data.get("parent", ""),
        "category": req_data.get("category", ""),
        "basis": req_data.get("basis", ""),
        "asset_no": req_data.get("asset_no", ""),
        "stat_rule": req_data.get("stat_rule", ""),
        "registrant": req_data.get("registrant", ""),
        "regist_method": req_data.get("regist_method", ""),
        "regist_time": req_data.get("regist_time", ""),
        # 维度信息
        "dimensions": req_data.get("dimensions", ""),
        # 变更历史
        "history": req_data.get("history", "")
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

# ==================== AI分析和BI报表API ====================
@app.route('/api/ai/analyze', methods=['POST'])
def api_ai_analyze():
    """AI智能分析指标数据"""
    req_data = request.json
    metric_ids = req_data.get('metric_ids', [])
    analysis_type = req_data.get('type', 'summary')
    config = load_llm_config()

    metrics_data = []
    market_metrics = get_market_metrics()
    
    if metric_ids:
        for mid in metric_ids:
            metric = next((m for m in market_metrics if m['id'] == mid), None)
            if metric:
                metrics_data.append({
                    'id': metric['id'],
                    'name': metric['name'],
                    'category': metric['category'],
                    'unit': metric.get('unit', ''),
                    'permission': metric.get('permission', ''),
                    'description': metric.get('description', '')
                })
    else:
        metrics_data = [{
            'id': m['id'],
            'name': m['name'],
            'category': m['category'],
            'unit': m.get('unit', ''),
            'description': m.get('description', '')
        } for m in market_metrics[:5]]

    context = f"""
    【待分析指标数据】
    {json.dumps(metrics_data, ensure_ascii=False, indent=2)}

    【分析类型】: {analysis_type}
    """

    system_prompt = """
    你是一名专业的金融数据分析专家，擅长对银行和金融业务指标进行深度分析。

    【分析框架】(固定结构):
    1. 先给【核心发现】(3-5点，每点1-2句，突出最重要的数据变化和趋势)
    2. 再给【详细分析】(针对每个指标，分析其数值、同比环比变化、行业对比、业务含义)
    3. 最后给【建议措施】(1-3条可执行的业务建议)

    【分析类型规则】:
    - summary(摘要分析): 简洁明了，总字数控制在200-300字，快速把握核心要点
    - detailed(详细分析): 全面深入，总字数不少于500字，多维度剖析指标关系
    - trend(趋势分析): 重点分析时间序列变化，识别趋势模式、周期性规律和异常点

    【输出格式要求】:
    - 使用Markdown格式
    - 使用##二级标题和###三级标题组织内容
    - 使用**加粗**突出关键数据和结论
    - 使用列表展示多个要点
    - 语言专业、准确、简洁，避免冗余

    【内容边界】:
    - 仅限分析提供的指标数据，不涉及其他业务领域
    - 基于数据给出客观分析，不做主观猜测
    - 如果数据不足，明确指出需要补充的信息

    请开始分析：
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context}
    ]

    response, error = call_llm(messages)

    if error:
        return jsonify({
            "success": False,
            "error": error,
            "analysis": None,
            "metrics": metrics_data,
            "analysis_type": analysis_type
        })

    return jsonify({
        "success": True,
        "analysis": response,
        "metrics": metrics_data,
        "analysis_type": analysis_type,
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "model_used": config.get("model", "unknown") if config else "unknown"
    })


@app.route('/api/ai/generate_report', methods=['POST'])
def api_ai_generate_report():
    """生成BI报表"""
    req_data = request.json
    metric_ids = req_data.get('metric_ids', [])
    report_type = req_data.get('type', 'detailed')
    title = req_data.get('title', '指标分析报告')
    config = load_llm_config()

    if not metric_ids:
        return jsonify({"success": False, "error": "请选择要分析的指标"}), 400

    metrics_data = []
    market_metrics = get_market_metrics()
    
    trend_data_map = {}
    for mid in metric_ids:
        metric = next((m for m in market_metrics if m['id'] == mid), None)
        if metric:
            metrics_data.append({
                'id': metric['id'],
                'name': metric['name'],
                'category': metric['category'],
                'unit': metric.get('unit', ''),
                'permission': metric.get('permission', ''),
                'description': metric.get('description', ''),
                'popularity': metric.get('popularity', 0)
            })
            
            trend_result = api_metric_trend(mid)
            trend_data_map[mid] = trend_result.get_json()

    context = f"""
    【报告标题】: {title}
    【报告类型】: {report_type}
    【指标列表】:
    {json.dumps(metrics_data, ensure_ascii=False, indent=2)}
    
    【趋势数据】:
    {json.dumps(trend_data_map, ensure_ascii=False, indent=2)}
    """

    system_prompt = """
    你是一名专业的金融BI报表生成专家，擅长制作高质量的银行和金融业务分析报告。

    【报告结构】(严格遵循):
    # {报告标题}

    ## 一、执行摘要
    - 用3-5句话概括本次分析的核心发现
    - 突出最重要的业务洞察和数据结论
    - 总字数控制在100-150字

    ## 二、核心指标概览
    - 使用表格展示所有指标的关键信息：指标名称、类别、单位、当前值、同比变化、环比变化
    - 对每个指标进行简要解读

    ## 三、数据分析与洞察
    基于趋势数据进行深度分析，包含：
    - 指标趋势分析：识别上升、下降、波动等模式
    - 指标关联分析：分析指标之间的相关性和影响关系
    - 异常识别：指出需要关注的异常数据点
    - 行业对比：如有数据，进行横向对比分析

    ## 四、业务建议
    基于分析结果给出3-5条可执行的业务建议，每条建议包含：
    - 建议内容
    - 预期效果
    - 实施优先级

    ## 五、风险提示
    如果发现异常指标或潜在风险，在此部分明确指出并给出预警建议

    【报告类型规则】:
    - detailed(详细报告): 全面深入，总字数不少于800字，包含完整的分析框架
    - summary(摘要报告): 简洁明了，总字数控制在300-500字，重点突出核心发现
    - trend(趋势分析报告): 侧重时间序列分析，总字数不少于600字，包含趋势图表描述和预测

    【输出格式要求】:
    - 使用Markdown格式，标题层级清晰
    - 使用**加粗**突出关键数据和结论
    - 使用表格展示数据对比
    - 使用列表展示多个要点
    - 语言专业、准确、简洁，适合管理层阅读
    - 总字数不少于500字，确保分析的系统性和完整性

    请开始生成报告：
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context}
    ]

    response, error = call_llm(messages)

    if error:
        return jsonify({
            "success": False,
            "error": error,
            "report": None,
            "title": title,
            "metrics": metrics_data,
            "trend_data": trend_data_map,
            "report_type": report_type
        })

    return jsonify({
        "success": True,
        "report": response,
        "title": title,
        "metrics": metrics_data,
        "trend_data": trend_data_map,
        "report_type": report_type,
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "model_used": config.get("model", "unknown") if config else "unknown"
    })


@app.route('/api/ai/ask', methods=['POST'])
def api_ai_ask():
    """AI问答接口"""
    req_data = request.json
    question = req_data.get('question', '')
    config = load_llm_config()
    
    if not question.strip():
        return jsonify({"success": False, "error": "请输入问题"}), 400
    
    system_prompt = """
    你是一名专业的金融数据分析助手。请根据用户的问题，基于系统中的指标数据进行回答。
    
    【回答要求】:
    - 回答要专业、准确、简洁
    - 如果涉及具体指标数据，请使用系统中已有的数据
    - 如果问题超出金融数据分析范围，请礼貌说明
    - 使用Markdown格式组织回答
    - 语言使用中文
    
    【可用指标领域】:
    - 财务指标：净利润率、ROE、不良贷款率、流动性比率等
    - 风险指标：资本充足率、拨备覆盖率等
    - 客户指标：客户满意度、客户流失率等
    - 运营指标：成本收入比、员工人均产能等
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question}
    ]
    
    response, error = call_llm(messages)
    
    if error:
        return jsonify({
            "success": False,
            "error": error
        })
    
    return jsonify({
        "success": True,
        "answer": response,
        "question": question,
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "model_used": config.get("model", "unknown") if config else "unknown"
    })


@app.route('/api/ai/insights', methods=['POST'])
def api_ai_insights():
    """获取AI洞察分析"""
    req_data = request.json
    metric_ids = req_data.get('metric_ids', [])
    config = load_llm_config()

    if not metric_ids:
        return jsonify({"success": False, "error": "请选择要分析的指标"}), 400

    market_metrics = get_market_metrics()
    selected_metrics = []
    for mid in metric_ids:
        metric = next((m for m in market_metrics if m['id'] == mid), None)
        if metric:
            selected_metrics.append({
                'id': metric['id'],
                'name': metric['name'],
                'category': metric['category'],
                'unit': metric.get('unit', ''),
                'popularity': metric.get('popularity', 0),
                'description': metric.get('description', '')
            })

    context = f"""
    【待分析指标列表】
    {json.dumps(selected_metrics, ensure_ascii=False, indent=2)}
    """

    system_prompt = """
    你是一名专业的金融数据洞察专家。请根据提供的指标列表，为每个指标生成一条精准的洞察分析。

    【输出格式要求】:
    请严格按照以下JSON数组格式输出，不要包含任何额外的文本或解释：
    [
        {{
            "metric_id": "指标ID",
            "metric_name": "指标名称",
            "insight_type": "洞察类型",
            "insight": "洞察内容",
            "severity": "严重程度",
            "recommendation": "建议措施"
        }}
    ]

    【洞察类型】:
    - trend: 趋势型洞察，适合指标表现良好或有明显趋势变化的情况
    - alert: 预警型洞察，适合指标表现异常或存在风险的情况
    - normal: 正常型洞察，适合指标表现平稳的情况

    【严重程度】:
    - high: 高优先级，需要立即关注和处理
    - medium: 中优先级，需要定期监控
    - low: 低优先级，正常关注即可

    【洞察内容要求】:
    - 基于指标名称、类别和描述，给出具体的数据洞察
    - 洞察内容要专业、准确、简洁
    - 长度控制在30-50字

    【建议措施要求】:
    - 基于洞察内容给出可执行的业务建议
    - 建议要具体、可行
    - 长度控制在30-50字

    请直接输出JSON格式的洞察结果，不要包含markdown格式或其他额外内容。
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context}
    ]

    response, error = call_llm(messages)

    if error:
        return jsonify({
            "success": False,
            "error": error,
            "insights": None,
            "total": 0,
            "selected_metrics": [m['name'] for m in selected_metrics]
        })

    try:
        insights = json.loads(response)
    except:
        return jsonify({
            "success": False,
            "error": "模型返回格式解析失败，请检查模型配置",
            "insights": None,
            "total": 0,
            "raw_response": response[:500] if len(response) > 500 else response
        })

    return jsonify({
        "success": True,
        "insights": insights,
        "total": len(insights),
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "model_used": config.get("model", "unknown") if config else "unknown"
    })


def generate_mock_insight(metric):
    """生成模拟洞察"""
    insights = {
        '客户流失率': ['客户流失率近期呈现上升趋势，建议关注', '流失客户主要集中在年轻客户群体', '竞品活动可能影响了客户留存'],
        '产品收益率': ['产品收益率保持稳定增长', '高端产品收益率表现突出', '建议优化产品组合提升整体收益'],
        '渠道转化率': ['线上渠道转化率提升明显', '移动端用户增长迅速', '线下渠道需要加强运营'],
        '风控评分': ['风控评分整体良好', '部分客户风险评分偏低', '建议加强贷前审核'],
        '营销效果': ['近期营销活动效果显著', 'ROI达到预期目标', '建议扩大营销投入'],
        '资金流动性': ['资金流动性充足', '短期资金周转顺畅', '建议关注长期资金配置'],
        '合规指标': ['合规指标符合监管要求', '近期检查未发现问题', '建议持续监控合规风险'],
        '员工绩效': ['员工绩效整体达标', '部分团队表现优异', '建议加强培训提升整体水平'],
        '净利润率': ['净利润率保持稳健', '成本控制效果明显', '建议优化收入结构'],
        'ROE': ['ROE表现良好', '股东权益回报稳定', '建议提升资产利用效率'],
        'ROA': ['总资产收益率平稳', '资产配置合理', '建议关注资产质量'],
        '不良贷款率': ['不良贷款率处于可控范围', '风险敞口在安全区间', '建议加强贷后管理'],
        '流动性比率': ['流动性比率健康', '资金周转灵活', '建议保持合理的流动性储备'],
        '成本收入比': ['成本收入比优化中', '运营效率提升', '建议持续压缩成本'],
        '资产负债率': ['资产负债率适中', '财务杠杆合理', '建议关注负债结构'],
        '流动比率': ['流动比率良好', '短期偿债能力强', '建议保持合理的流动资产规模']
    }
    
    import random
    if metric['name'] in insights:
        return random.choice(insights[metric['name']])
    
    return f"{metric['name']}运行正常，未发现异常情况"


def generate_mock_recommendation(metric):
    """生成模拟建议"""
    recommendations = {
        '客户流失率': '建议开展客户关怀活动，优化产品体验，提升客户粘性',
        '产品收益率': '建议继续优化产品设计，推出差异化产品满足不同客户需求',
        '渠道转化率': '建议加大线上渠道投入，优化用户体验，提升转化率',
        '风控评分': '建议建立完善的风险预警机制，加强风险监控',
        '营销效果': '建议继续保持当前营销策略，同时探索新的营销渠道',
        '资金流动性': '建议保持合理的资金配置，确保资金安全',
        '合规指标': '建议定期开展合规检查，确保业务合规运营',
        '员工绩效': '建议建立完善的绩效考核体系，激励员工提升绩效',
        '净利润率': '建议持续优化成本结构，提升盈利能力',
        'ROE': '建议提升资产运营效率，增加股东回报',
        'ROE': '建议优化资产配置，提升资产使用效率',
        '不良贷款率': '建议加强风险管理，降低不良贷款率',
        '流动性比率': '建议保持充足的流动性储备，防范流动性风险',
        '成本收入比': '建议持续优化成本管理，提升运营效率',
        '资产负债率': '建议保持合理的资本结构，控制财务风险',
        '流动比率': '建议保持合理的流动资产规模，确保短期偿债能力'
    }
    
    if metric['name'] in recommendations:
        return recommendations[metric['name']]
    
    return f"建议持续关注{metric['name']}的变化，及时采取应对措施"


# ==================== LLM配置管理API ====================
@app.route('/api/llm/config', methods=['GET'])
def api_llm_get_config():
    """获取当前LLM配置"""
    config_data = load_llm_config()
    active_key = config_data.get('active_config', 'default')
    active_config = config_data['configs'].get(active_key, {})
    
    masked_configs = {}
    for key, cfg in config_data['configs'].items():
        masked = cfg.copy()
        if masked.get('api_key'):
            masked['api_key'] = '***' + masked['api_key'][-4:] if len(masked['api_key']) > 4 else '***'
        if masked.get('api_secret'):
            masked['api_secret'] = '***' + masked['api_secret'][-4:] if len(masked['api_secret']) > 4 else '***'
        masked_configs[key] = masked
    
    return jsonify({
        "success": True,
        "active_config": active_key,
        "configs": masked_configs,
        "current_config": masked_configs.get(active_key, {}),
        "providers": SUPPORTED_LLM_PROVIDERS
    })


@app.route('/api/llm/config', methods=['POST'])
def api_llm_save_config():
    """保存LLM配置"""
    global LLM_CONFIG
    req_data = request.json
    
    config_key = req_data.get('config_key', 'default')
    config_name = req_data.get('name', '配置' + config_key)
    
    provider_info = SUPPORTED_LLM_PROVIDERS.get(req_data.get('api_type', 'openai'), {})
    
    config_data = load_llm_config()
    
    new_config = {
        "name": config_name,
        "enabled": req_data.get("enabled", True),
        "api_type": req_data.get("api_type", "openai"),
        "api_key": req_data.get("api_key", ""),
        "api_secret": req_data.get("api_secret", ""),
        "base_url": req_data.get("base_url", provider_info.get("base_url", "https://api.openai.com/v1")),
        "model": req_data.get("model", provider_info.get("models", ["gpt-4o-mini"])[0]),
        "model_size": req_data.get("model_size", "small"),
        "max_tokens": req_data.get("max_tokens", 2000),
        "temperature": req_data.get("temperature", 0.7),
        "timeout": req_data.get("timeout", 60)
    }
    
    if not new_config['base_url'] and provider_info.get('base_url'):
        new_config['base_url'] = provider_info['base_url']
    
    if not new_config['model'] and provider_info.get('models'):
        new_config['model'] = provider_info['models'][0]
    
    config_data['configs'][config_key] = new_config
    
    LLM_CONFIG = save_llm_config(config_data)
    
    masked_config = new_config.copy()
    if masked_config.get('api_key'):
        masked_config['api_key'] = '***' + masked_config['api_key'][-4:] if len(masked_config['api_key']) > 4 else '***'
    if masked_config.get('api_secret'):
        masked_config['api_secret'] = '***' + masked_config['api_secret'][-4:] if len(masked_config['api_secret']) > 4 else '***'
    
    return jsonify({
        "success": True,
        "config_key": config_key,
        "config": masked_config,
        "message": "LLM配置已保存"
    })


@app.route('/api/llm/config/switch', methods=['POST'])
def api_llm_switch_config():
    """切换当前使用的配置"""
    global LLM_CONFIG
    req_data = request.json
    config_key = req_data.get('config_key', 'default')
    
    config_data = load_llm_config()
    
    if config_key not in config_data['configs']:
        return jsonify({
            "success": False,
            "error": f"配置 '{config_key}' 不存在"
        })
    
    config_data['active_config'] = config_key
    LLM_CONFIG = save_llm_config(config_data)
    
    active_config = config_data['configs'][config_key]
    masked_config = active_config.copy()
    if masked_config.get('api_key'):
        masked_config['api_key'] = '***' + masked_config['api_key'][-4:] if len(masked_config['api_key']) > 4 else '***'
    if masked_config.get('api_secret'):
        masked_config['api_secret'] = '***' + masked_config['api_secret'][-4:] if len(masked_config['api_secret']) > 4 else '***'
    
    return jsonify({
        "success": True,
        "active_config": config_key,
        "config": masked_config,
        "message": f"已切换到配置: {active_config.get('name', config_key)}"
    })


@app.route('/api/llm/config/add', methods=['POST'])
def api_llm_add_config():
    """添加新的LLM配置"""
    global LLM_CONFIG
    req_data = request.json
    
    config_name = req_data.get('name', '新配置')
    
    provider_info = SUPPORTED_LLM_PROVIDERS.get(req_data.get('api_type', 'openai'), {})
    
    config_data = load_llm_config()
    
    new_key = 'config_' + str(len(config_data['configs']) + 1)
    
    new_config = {
        "name": config_name,
        "enabled": req_data.get("enabled", True),
        "api_type": req_data.get("api_type", "openai"),
        "api_key": req_data.get("api_key", ""),
        "api_secret": req_data.get("api_secret", ""),
        "base_url": req_data.get("base_url", provider_info.get("base_url", "https://api.openai.com/v1")),
        "model": req_data.get("model", provider_info.get("models", ["gpt-4o-mini"])[0]),
        "model_size": req_data.get("model_size", "small"),
        "max_tokens": req_data.get("max_tokens", 2000),
        "temperature": req_data.get("temperature", 0.7),
        "timeout": req_data.get("timeout", 60)
    }
    
    config_data['configs'][new_key] = new_config
    LLM_CONFIG = save_llm_config(config_data)
    
    masked_config = new_config.copy()
    if masked_config.get('api_key'):
        masked_config['api_key'] = '***' + masked_config['api_key'][-4:] if len(masked_config['api_key']) > 4 else '***'
    if masked_config.get('api_secret'):
        masked_config['api_secret'] = '***' + masked_config['api_secret'][-4:] if len(masked_config['api_secret']) > 4 else '***'
    
    return jsonify({
        "success": True,
        "config_key": new_key,
        "config": masked_config,
        "message": "新配置已添加"
    })


@app.route('/api/llm/config/delete', methods=['POST'])
def api_llm_delete_config():
    """删除LLM配置"""
    global LLM_CONFIG
    req_data = request.json
    config_key = req_data.get('config_key', '')
    
    if not config_key:
        return jsonify({
            "success": False,
            "error": "请指定要删除的配置"
        })
    
    config_data = load_llm_config()
    
    if config_key not in config_data['configs']:
        return jsonify({
            "success": False,
            "error": f"配置 '{config_key}' 不存在"
        })
    
    if config_key == config_data.get('active_config'):
        return jsonify({
            "success": False,
            "error": "不能删除当前正在使用的配置，请先切换到其他配置"
        })
    
    del config_data['configs'][config_key]
    LLM_CONFIG = save_llm_config(config_data)
    
    return jsonify({
        "success": True,
        "config_key": config_key,
        "message": "配置已删除"
    })


@app.route('/api/llm/test', methods=['POST'])
def api_llm_test_connection():
    """测试LLM连接"""
    req_data = request.json
    
    test_config = {
        "enabled": True,
        "api_type": req_data.get("api_type", "openai"),
        "api_key": req_data.get("api_key", ""),
        "api_secret": req_data.get("api_secret", ""),
        "base_url": req_data.get("base_url", "https://api.openai.com/v1"),
        "model": req_data.get("model", "gpt-4o-mini"),
        "max_tokens": 100,
        "temperature": 0.7,
        "timeout": 30
    }
    
    messages = [
        {"role": "system", "content": "你是一个测试助手，请用简短的语言确认连接成功。"},
        {"role": "user", "content": "请确认连接是否正常。"}
    ]
    
    response, error = call_llm(messages, test_config)
    
    if error:
        return jsonify({
            "success": False,
            "message": f"连接失败: {error}"
        })
    
    return jsonify({
        "success": True,
        "message": "连接成功",
        "response": response[:100] + "..." if len(response) > 100 else response
    })


@app.route('/api/llm/providers', methods=['GET'])
def api_llm_get_providers():
    """获取支持的LLM提供商列表"""
    return jsonify({
        "success": True,
        "providers": SUPPORTED_LLM_PROVIDERS
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

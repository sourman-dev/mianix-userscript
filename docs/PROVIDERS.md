## Providers LLM 

ANTHROPIC
AVIAN
AWS
AZURE
BEDROCK
COHERE
DEEPSEEK
FIREWORKS
GOOGLE
GROQ
LLAMA
MISTRAL
NEBIUS
NOVITA
OPENAI
OPENROUTER
PERPLEXITY
QSTASH
TOGETHER
VERCEL
X

## Basic Api
```
# Get all models with costs per 1 million tokens
curl "https://www.helicone.ai/api/llm-costs"

# Get costs for a specific provider
curl "https://www.helicone.ai/api/llm-costs?provider=openai"

# Search for models containing "gpt"
curl "https://www.helicone.ai/api/llm-costs?model=gpt"

# Combine filters
curl "https://www.helicone.ai/api/llm-costs?provider=anthropic&model=claude"
```

## Response format

```
{
  "metadata": {
    "total_models": 250,
    "note": "All costs are per 1 million tokens unless otherwise specified",
    "operators_explained": {
      "equals": "Model name must match exactly",
      "startsWith": "Model name must start with the specified value",
      "includes": "Model name must contain the specified value"
    }
  },
  "data": [
    {
      "provider": "OPENAI",
      "model": "gpt-4",
      "operator": "equals",
      "input_cost_per_1m": 30.0,
      "output_cost_per_1m": 60.0,
      "show_in_playground": true
    }
  ]
}
```

### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| provider | string | - | Filter by exact provider name (e.g., "OPENAI", "ANTHROPIC") |
| model | string | - | Search models containing this text (e.g., "gpt", "claude") |
| format | string | json | Output format: "json" or "csv" |

### Response Fields
| Field	| Description |
| --- | --- |
| provider	| Provider name (e.g., "OPENAI", "ANTHROPIC") |
| model	| Model identifier |
| operator	| How the model name matching works ("equals", "startsWith", "includes") |
| input_cost_per_1m	| Cost per 1 million input tokens (USD) |
| output_cost_per_1m	| Cost per 1 million output tokens (USD) |
| per_image	| Cost per image (USD) - if applicable |
| per_call	| Cost per API call (USD) - if applicable |

## USD Rate
```
https://www.vietcombank.com.vn/api/exchangerates?date=2025-12-09
```

### Response format

```
{"Count":20,"Date":"2025-12-09T00:00:00","UpdatedDate":"2025-12-09T08:16:30+07:00","Data":[{"currencyName":"US DOLLAR","currencyCode":"USD","cash":"26142.00","transfer":"26172.00","sell":"26412.00","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_usa.svg?h=32&w=32&ts=20230610195953&hash=4576D9B7C910424CC72B7A592BA369AE"},{"currencyName":"EURO","currencyCode":"EUR","cash":"29895.30","transfer":"30197.27","sell":"31471.27","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_eur.svg?h=32&w=32&ts=20230610195955&hash=10502813C2316A5601FD57F7A0C89A3A"},{"currencyName":"UK POUND STERLING","currencyCode":"GBP","cash":"34218.16","transfer":"34563.80","sell":"35670.59","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_gbp.svg?h=32&w=32&ts=20230610195950&hash=72ED63A02E20F8B413E65DE9B7F062AE"},{"currencyName":"JAPANESE YEN","currencyCode":"JPY","cash":"163.07","transfer":"164.72","sell":"173.43","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_jpy.svg?h=32&w=32&ts=20230610195953&hash=C5D3E7B6B5EEE49C3D5C3C3A8B6798B8"},{"currencyName":"AUSTRALIAN DOLLAR","currencyCode":"AUD","cash":"17003.77","transfer":"17175.52","sell":"17725.51","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_aud.svg?h=32&w=32&ts=20230610195950&hash=F70700292015EB326CA79643D4F05C03"},{"currencyName":"SINGAPORE DOLLAR","currencyCode":"SGD","cash":"19778.03","transfer":"19977.80","sell":"20658.81","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_sgd.svg?h=32&w=32&ts=20230709003433&hash=C95A1CFD98A6896023B5EFE9D23459AA"},{"currencyName":"THAI BAHT","currencyCode":"THB","cash":"728.56","transfer":"809.52","sell":"843.84","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_thb.svg?h=32&w=32&ts=20230610195952&hash=AB6CDBA1C854ADE46132EBF0A6DCFEF4"},{"currencyName":"CANADIAN DOLLAR","currencyCode":"CAD","cash":"18546.95","transfer":"18734.29","sell":"19334.19","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_cad.svg?h=32&w=32&ts=20230610195951&hash=55B303641110059C97F6ABDE45B2FE20"},{"currencyName":"SWISS FRANC","currencyCode":"CHF","cash":"31851.27","transfer":"32173.00","sell":"33203.23","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_chf.svg?h=32&w=32&ts=20230610195952&hash=CBA2E48794BD6E04AAF8761C55AB07DF"},{"currencyName":"HONG KONG DOLLAR","currencyCode":"HKD","cash":"3293.33","transfer":"3326.60","sell":"3453.79","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_hkd.svg?h=32&w=32&ts=20230610195951&hash=E50E43ECCD43C736E273734DEEB000D8"},{"currencyName":"CHINESE YUAN","currencyCode":"CNY","cash":"3633.32","transfer":"3670.02","sell":"3787.54","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_cny.svg?h=32&w=32&ts=20230610195953&hash=1E37E5E1D30CA9F186D9B8A0A188AE7C"},{"currencyName":"DANISH KRONE","currencyCode":"DKK","cash":"0.00","transfer":"4032.52","sell":"4186.70","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_dkk.svg?h=32&w=32&ts=20230610195954&hash=7A1074CAFFF3E4469DD8DBFA9F95D1C0"},{"currencyName":"INDIAN RUPEE","currencyCode":"INR","cash":"0.00","transfer":"290.86","sell":"303.37","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_inr.svg?h=32&w=32&ts=20230610195952&hash=6E19DDEEC1053D83CE9C98283BE347AC"},{"currencyName":"KOREAN WON","currencyCode":"KRW","cash":"15.50","transfer":"17.22","sell":"18.68","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_krw.svg?h=32&w=32&ts=20230709003433&hash=43B80AF8FF6632988EB89EF0C30BDDE6"},{"currencyName":"KUWAITI DINAR","currencyCode":"KWD","cash":"0.00","transfer":"85315.61","sell":"89450.41","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_kwd.svg?h=32&w=32&ts=20230610195949&hash=76B738C67E5151DBB4F9D27A0DEA2FC3"},{"currencyName":"MALAYSIAN RINGGIT","currencyCode":"MYR","cash":"0.00","transfer":"6329.90","sell":"6467.59","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_myr.svg?h=32&w=32&ts=20230610195950&hash=4736802FBB11427761408F193E6452EC"},{"currencyName":"NORWEGIAN KRONE","currencyCode":"NOK","cash":"0.00","transfer":"2550.95","sell":"2659.10","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_nok.svg?h=32&w=32&ts=20230610195951&hash=48B571580E4926C86F257FE4D167F750"},{"currencyName":"RUSSIAN RUBLE","currencyCode":"RUB","cash":"0.00","transfer":"327.72","sell":"362.77","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_rub.svg?h=32&w=32&ts=20230709003433&hash=B5A31D5C371B6C922EBB4808605705EB"},{"currencyName":"SAUDI ARABIAN RIYAL","currencyCode":"SAR","cash":"0.00","transfer":"6983.28","sell":"7283.79","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_sar.svg?h=32&w=32&ts=20230610195954&hash=732C766503BA27FF3A8764FAF20A2C0F"},{"currencyName":"SWEDISH KRONA","currencyCode":"SEK","cash":"0.00","transfer":"2748.41","sell":"2864.94","icon":"/-/media/Default-Website/Default-Images/Icons/Flags/im_flag_sek.svg?h=32&w=32&ts=20230610195949&hash=88CF4CDE8DB12CA0D56485A05EC27A22"}]}
```

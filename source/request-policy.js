// 参考 isinglever/adguard 的 Apache-2.0 请求协议与清理逻辑，固定来源见 sources-local.json。
import { concat, editBytes, fields } from './wire.js';

export function stripAdSignals(body) {
  // Request.context(1).adSignalsInfo(9).params(1)：只删除已知的广告参数列表。
  // 不重建整个请求，保留用户上下文、未知字段及其他广告信号字段。
  return editBytes(body, 1, context => editBytes(context, 9, signals =>
    concat(fields(signals).filter(field => !(field.no === 1 && field.wire === 2)).map(field => field.raw))));
}

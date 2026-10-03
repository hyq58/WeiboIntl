import { concat, editBytes, fields, setInteger } from './wire.js';

export function transformPlayer(body, options) {
  // player.proto：7 为广告位，68 为广告槽位；未涉及的字段保留原始编码。
  let result = options.blockAds === false ? body : concat(fields(body)
    .filter((field) => field.no !== 7 && field.no !== 68).map((field) => field.raw));
  if (options.backgroundPlayback !== false) {
    // 仅启用后台播放，不添加画中画、下载、倍速或画质修改。
    result = editBytes(result, 2, (status) => editBytes(status, 11, (renderer) =>
      editBytes(renderer, 64657230, (ability) => setInteger(ability, 1, 1), true), true));
  }
  return result;
}

export function transformWatch(body, options, rootField = 1, transformNext = (value) => value) {
  return editBytes(body, rootField, (content) =>
    editBytes(editBytes(content, 2, (player) => transformPlayer(player, options)), 3, transformNext));
}

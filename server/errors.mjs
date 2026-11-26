// 集中错误体系：所有 handler 只抛这些类型，全局中间件统一归一化响应
export class AppError extends Error {
  constructor(status, code, message, detail) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

export const errors = {
  badRequest: (msg, code = 'bad_request') => new AppError(400, code, msg),
  unauthorized: (msg = '请先登录', code = 'unauthorized') => new AppError(401, code, msg),
  forbidden: (msg = '没有权限', code = 'forbidden') => new AppError(403, code, msg),
  notFound: (msg = '资源不存在', code = 'not_found') => new AppError(404, code, msg),
  unavailable: (msg = '服务暂时不可用', code = 'unavailable') => new AppError(503, code, msg),
}

/** 把任意异常归一化为 { status, body }，绝不外泄堆栈 */
export function normalizeError(err, reqId) {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { error: err.code, message: err.message, reqId },
    }
  }
  return {
    status: 500,
    body: { error: 'internal_error', message: '服务暂时不可用，请稍后重试', reqId },
  }
}

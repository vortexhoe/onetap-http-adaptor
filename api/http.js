class HttpManager {
  constructor() {
    this.requests = []
  }

  randomString() {
    return 'httpadp' + Math.random().toString(16).slice(2)
  }

  request(url, method, options, callback) {
    let id = this.randomString()
    let req = {
      id,
      url,
      method: method.toUpperCase(),
      ...options,
      callback,
      received: false,
    }
    this.requests.push(req)
    Object.keys(req).forEach((reqKey) => {
      if (!req[reqKey]) return
      DataFile.SetKey(req.id, reqKey, req[reqKey].toString())
    })
    //debug.print('Making http request to %s %s', req.method, req.url)
    DataFile.Save(req.id)
  }

  checkRequest(req) {
    let resKey = req.id + 'res'
    try {
      DataFile.Load(resKey)
      req.resLoaded = true
      var ready = DataFile.GetKey(resKey, 'responseReady')
      req.responseReady = ready === 'true'
      if (!req.responseReady) {
        req.resLoaded = false
        return
      }
      req.responseBody = DataFile.GetKey(resKey, 'responseBody')
      req.responseStatus = DataFile.GetKey(resKey, 'responseStatus')
      /*debug.print(
        'Http request to %s succeded (%s)',
        req.url,
        req.responseStatus
      )*/
      req.callback(req.responseBody, req.responseStatus)
    } catch (err) {
      //debug.print('[%s] Error checking request: %s', req.id, err.toString())
    }
  }

  checkBatch() {
    let removeIds = []
    this.requests.forEach((request) => {
      if (request.responseReady) return removeIds.push(request.id)
      this.checkRequest(request)
    })
    this.requests = this.requests.filter((req) => !removeIds.includes(req.id))
  }
}

const http = new HttpManager()

// runs http request checker every 10 frames
globalThis['http_idx'] = 0
globalThis['http'] = http
globalThis['http_cb'] = function http_cb() {
  globalThis['http_idx'] = globalThis['http_idx'] + 1
  if (globalThis['http_idx'] % 10 === 0) {
    globalThis['http_idx'] = 0
    globalThis['http'].checkBatch()
  }
}
Cheat.RegisterCallback('Draw', 'http_cb')

// make http requests like so:
// most options are passed directly into node-fetch, read their docs first
http.request(
  `http://localhost:3000/lookup?xuid=${steamId}`, // url
  'GET', // http verb
  {}, // options, go look above
  (body, status) => {
    // body is a string with the body
    // status is a number, http status code
  }
)

export default http

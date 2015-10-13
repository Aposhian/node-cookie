'use strict'

/**
 * node-cookie
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const chai        = require('chai')
const supertest   = require('co-supertest')
const expect      = chai.expect
const http        = require('http')
const sig         = require('cookie-signature')
const Keygrip     = require('keygrip')
const Cookie      = require('../src/Cookie')
const queryString = require('querystring')

require('co-mocha')

describe('Cookie', function () {

  it('should return an empty object when no cookies have been set', function * () {

    const server = http.createServer(function (req,res) {
      const cookies = Cookie.parse(req)
      res.writeHead(200,{"content-type": "application/json"})
      res.write(JSON.stringify({cookies}))
      res.end()
    })

    const res = yield supertest(server).get('/').expect(200).end()
    expect(res.body.cookies).deep.equal({})

  })

  it('should parse plain cookies for a given request when secret is not set', function * () {

    const server = http.createServer(function (req,res) {
      const cookies = Cookie.parse(req)
      res.writeHead(200,{"content-type": "application/json"})
      res.write(JSON.stringify({cookies}))
      res.end()
    })

    const res = yield supertest(server).get('/').set('Cookie',['user=foo']).expect(200).end()
    expect(res.body.cookies).deep.equal({user:'foo'})

  })

  it('should parse and unsing cookies when secret key is present', function * () {

    const SECRET = 'bubblegum'
    const cookieVal = sig.sign('foo',SECRET)

    const server = http.createServer(function (req,res) {
      const cookies = Cookie.parse(req,SECRET)
      res.writeHead(200,{"content-type": "application/json"})
      res.write(JSON.stringify({cookies}))
      res.end()
    })

    const res = yield supertest(server).get('/').set('Cookie',['user='+cookieVal]).expect(200).end()
    expect(res.body.cookies).deep.equal({user:'foo'})

  })


  it('should decrypt and unsign cookies when decrypt option is set', function * () {

    const SECRET = 'bubblegum'
    const keygrip = new Keygrip([SECRET])
    const cookieVal = sig.sign('foo',SECRET)
    const encryptedVal = keygrip.encrypt(cookieVal).toString('base64')

    const server = http.createServer(function (req,res) {
      const cookies = Cookie.parse(req,SECRET,true)
      res.writeHead(200,{"content-type": "application/json"})
      res.write(JSON.stringify({cookies}))
      res.end()
    })

    const res = yield supertest(server).get('/').set('Cookie',['user='+encryptedVal]).expect(200).end()
    expect(res.body.cookies).deep.equal({user:'foo'})

  })

  it('should decrypt and unsign cookies from an array', function * () {

    const SECRET = 'bubblegum'
    const keygrip = new Keygrip([SECRET])
    const cookieVal = sig.sign("j:"+JSON.stringify([1,2,3]),SECRET)
    const encryptedVal = keygrip.encrypt(cookieVal).toString('base64')

    const server = http.createServer(function (req,res) {
      const cookies = Cookie.parse(req,SECRET,true)
      res.writeHead(200,{"content-type": "application/json"})
      res.write(JSON.stringify({cookies}))
      res.end()
    })

    const res = yield supertest(server).get('/').set('Cookie',['cart='+encryptedVal]).expect(200).end()
    expect(res.body.cookies).deep.equal({cart:[1,2,3]})

  })

  it('should parse plain cookies from an array', function * () {

    const server = http.createServer(function (req,res) {
      const cookies = Cookie.parse(req)
      res.writeHead(200,{"content-type": "application/json"})
      res.write(JSON.stringify({cookies}))
      res.end()
    })

    const res = yield supertest(server).get('/').set('Cookie',['cart=j:'+JSON.stringify([1,2,3])]).expect(200).end()
    expect(res.body.cookies).deep.equal({cart:[1,2,3]})

  })


  it('should parse and unsign cookies from an array', function * () {

    const SECRET = 'bubblegum'
    const cookieVal = sig.sign("j:"+JSON.stringify([1,2,3]),SECRET)

    const server = http.createServer(function (req,res) {
      const cookies = Cookie.parse(req,SECRET)
      res.writeHead(200,{"content-type": "application/json"})
      res.write(JSON.stringify({cookies}))
      res.end()
    })

    const res = yield supertest(server).get('/').set('Cookie',['cart='+cookieVal]).expect(200).end()
    expect(res.body.cookies).deep.equal({cart:[1,2,3]})

  })

  it('should create plain cookies to be set on response', function * () {

    const server = http.createServer(function (req,res) {
      const cookie = Cookie.create('name','foo')
      res.setHeader('Set-Cookie',cookie.cookie)
      res.writeHead(200,{"content-type": "application/json"})
      res.end()
    })

    const res = yield supertest(server).get('/').expect(200).end()
    expect(res.headers['set-cookie']).deep.equal(['name=foo'])
  })

  it('should create signed cookies to be set on response', function * () {

    const SECRET = 'bubblegum'
    const valueToBe = sig.sign('foo',SECRET)

    const server = http.createServer(function (req,res) {
      const cookie = Cookie.create('name','foo', {}, SECRET)
      res.setHeader('Set-Cookie',cookie.cookie)
      res.writeHead(200,{"content-type": "application/json"})
      res.end()
    })

    const res = yield supertest(server).get('/').expect(200).end()
    expect(res.headers['set-cookie']).deep.equal(['name='+queryString.escape(valueToBe)])
  })

  it('should create signed and encrypted cookies to be set on response', function * () {

    const SECRET = 'bubblegum'
    const keygrip = new Keygrip([SECRET])
    let valueToBe = sig.sign('foo',SECRET)
    valueToBe = keygrip.encrypt(valueToBe).toString('base64')

    const server = http.createServer(function (req,res) {
      const cookie = Cookie.create('name','foo', {}, SECRET, true)
      res.setHeader('Set-Cookie',cookie.cookie)
      res.writeHead(200,{"content-type": "application/json"})
      res.end()
    })

    const res = yield supertest(server).get('/').expect(200).end()
    expect(res.headers['set-cookie']).deep.equal(['name='+queryString.escape(valueToBe)])
  })

  it('should set cookies via set method', function * () {

    const SECRET = 'bubblegum'
    const keygrip = new Keygrip([SECRET])
    let valueToBe = sig.sign('foo',SECRET)
    valueToBe = keygrip.encrypt(valueToBe).toString('base64')

    const server = http.createServer(function (req,res) {
      const cookie = Cookie.create('name','foo', {}, SECRET, true)
      Cookie.setHeader(res,[cookie])
      res.writeHead(200,{"content-type": "application/json"})
      res.end()
    })

    const res = yield supertest(server).get('/').expect(200).end()
    expect(res.headers['set-cookie']).deep.equal(['name='+queryString.escape(valueToBe)])

  })

  it('should set multiple cookies via set method', function * () {

    const SECRET = 'bubblegum'
    const keygrip = new Keygrip([SECRET])
    let cookies = []
    let valueToBe = sig.sign('foo',SECRET)
    valueToBe = keygrip.encrypt(valueToBe).toString('base64')

    let ageToBe = sig.sign('22',SECRET)
    ageToBe = keygrip.encrypt(ageToBe).toString('base64')


    const server = http.createServer(function (req,res) {

      cookies.push(Cookie.create('name','foo', {}, SECRET, true))
      cookies.push(Cookie.create('age',22, {}, SECRET, true))

      Cookie.setHeader(res,cookies)
      res.writeHead(200,{"content-type": "application/json"})
      res.end()
    })

    const res = yield supertest(server).get('/').expect(200).end()
    expect(res.headers['set-cookie']).deep.equal(['name='+queryString.escape(valueToBe),'age='+queryString.escape(ageToBe)])
  })


it('should set object as a cookie value', function * () {

    const SECRET = 'bubblegum'
    const keygrip = new Keygrip([SECRET])
    const data = {name:'foo',age:22}
    let cookies = []
    let valueToBe = sig.sign("j:"+JSON.stringify(data),SECRET)
    valueToBe = keygrip.encrypt(valueToBe).toString('base64')

    const server = http.createServer(function (req,res) {

      cookies.push(Cookie.create('user',data, {}, SECRET, true))
      Cookie.setHeader(res,cookies)
      res.writeHead(200,{"content-type": "application/json"})
      res.end()
    })

    const res = yield supertest(server).get('/').expect(200).end()
    expect(res.headers['set-cookie']).deep.equal(['user='+queryString.escape(valueToBe)])
  })

})

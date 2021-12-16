/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai'

import asynchronousChain from '../src/asynchronousChain'

import type { ElementHandlerCb, ElementHandlerCb2, APreviousResultCb } from '../src/asynchronousChain'

const asyncFunc = (element: any, time: number) => {
  let fin = false
  const afterTriggers: (() => void)[] = []
  const beforeTriggers: (() => void)[] = []
  const start = (cb: (result: any, lastElement: boolean) => void, lastElement: boolean) => {
    // debugger
    console.log(`STEP 1: start called for : ${element}`)
    // debugger
    if (fin) throw new Error('called twice')
    fin = true
    const doneFn = () => {
      beforeTriggers.forEach((trigger) => setImmediate(trigger))
      setImmediate(() => cb(element, lastElement))
      console.log(`STEP 2: .then called for : ${element}`)
      afterTriggers.forEach((trigger) => setImmediate(trigger))
    }
    if (time) setTimeout(doneFn, time)
    else doneFn()
  }
  return {
    start,
    addBeforeDoneTrigger: (callback: () => void) => {
      if (fin) throw Error('already done')
      beforeTriggers.push(callback)
    },
    addAfterDoneTrigger: (callback: () => void) => {
      if (fin) throw Error('already done')
      afterTriggers.push(callback)
    },
  }
}

describe('asynchronousChain', () => {
  describe('Basics', () => {
    it('chain should be done and return 0+1+2+3+4+5=15', (done) => {
      const conArray = [5, 1, 2, 3, 4, 0]
      const eHandlerCb: ElementHandlerCb = (element, awaitPreviousResult) => {
        setTimeout(() => {
          element((value: number) => {
            // expect(result).to.equal(conArray[i - 1])
            console.log(`STEP 3: result received from .then: ${value}`)
            // eslint-disable-next-line default-param-last
            awaitPreviousResult((previousResult = 0, elementDoneCb) => {
              console.log(`STEP 4: previousResult received: ${previousResult} - value: ${value}`)
              // debugger
              elementDoneCb(
                previousResult + value,
                value >= conArray.length - 1,
              )
            })
          })
        }, 100)
      }
      const chain = asynchronousChain(
        eHandlerCb,
        (result) => {
          console.log(`STEP 5: final result ${result}`)
          expect(result).to.equal(15)
          done()
        },
      )

      conArray.forEach((item) => {
        // debugger
        chain.add(asyncFunc(item, item % 2 === 0 ? 100 : 200).start, item)
      })
      expect(chain.length).to.equal(conArray.length)
    })
    it('sequential chain should be done and return 0+1+2+3+4+5=15', (done) => {
      const conArray = [5, 1, 2, 3, 4, 0]
      // const i = 0
      const eHandlerCb: ElementHandlerCb2 = (element, elementDoneCb, previousResult = 0) => {
        // debugger
        setTimeout(() => {
          element((value: number) => {
            // debugger
            // expect(value).to.equal(conArray[i])
            // i += 1
            console.log(`STEP 3: .then  previousResult: ${previousResult} value: ${value}`)
            elementDoneCb(
              previousResult + value,
              value >= conArray.length - 1,
            )
          })
        }, 100)
      }
      const chain = asynchronousChain(
        eHandlerCb,
        (result) => {
          console.log(`STEP 4: result: ${result}`)
          expect(result).to.equal(15)
          done()
        },
        undefined,
        true,
      )

      conArray.forEach((item) => chain.add(asyncFunc(item, 100).start, item))
      expect(chain.length).to.equal(conArray.length)
    })
    it('example code : basic usage', () => {
      const elementHandlerCb = (
        // element iterated over, in this case an async function
        asyncFn: (success: (result: number) => void) => void,
        // a function to await the previous element's result
        awaitPreviousResult: (previousResultCb: (
                    previousResult: undefined | number,
                    elementDone: (result: number, lastElement: boolean) => void
                ) => any) => void,
      ) => {
        asyncFn((result: number) => {
          // elements are processed after being added
          console.log(`async element result received: ${result}`)
          awaitPreviousResult((previousResult, elementDone) => {
            // results are always returned in sequence
            console.log(`async element previousResult received: ${previousResult}`)
            // returns result from async function and flags element as done
            setTimeout(() => elementDone(result * 2, result === 3), 100)
          })
        })
      }

      const chainDoneCb = (result: any) => console.log(`chain completed with ${result}`)

      const chain = asynchronousChain(elementHandlerCb, chainDoneCb)

      chain.add((asyncFn: any) => setTimeout(() => asyncFn(1), 200))
      chain.add((asyncFn: any) => setTimeout(() => asyncFn(2), 100))
      chain.add((asyncFn: any) => setTimeout(() => asyncFn(3), 100))
    })
    it('example code : serial usage', () => {
      const elementHandlerCb = (
        // element iterated over, in this case an async function
        asyncFn: (success: (result: number) => void) => void,
        // a function to call once the element is done processing
        elementDone: (result: number, lastElement?: boolean) => any,
        /* the result from the preceding `elementDone` coll */
        previousResult: undefined | number,
      ) => {
        asyncFn((result: number) => {
          // elements are processed sequentially based on index
          console.log(`async element result received: ${result} and previous result: ${previousResult}`)
          setTimeout(() => elementDone(result * 2, result === 3), 100)
        })
      }

      const chainDoneCb = (result: any) => console.log(`chain completed with ${result}`)

      const chain = asynchronousChain(elementHandlerCb, chainDoneCb, undefined, true)

      chain.add((asyncFn: any) => setTimeout(() => asyncFn(1), 100))
      chain.add((asyncFn: any) => setTimeout(() => asyncFn(2), 100))
      chain.add((asyncFn: any) => setTimeout(() => asyncFn(3), 100))
    })
    it('example code : array prototype usage', () => {
      const elementHandlerCb = (
        // element iterated over, in this case an async function
        asyncFn: (result: any) => void,
        // a function to await the results from the previous element
        awaitPreviousResult: (previousResultCb: APreviousResultCb) => void,
      ) => {
        asyncFn((result: number) => {
          console.log(`result being processed: ${result}`)
          awaitPreviousResult((previousResult, elementDone) => {
            // results are always returned in sequence
            console.log(`async element received previous result: ${previousResult}`)
            // returns result from async function and flags element as done
            setTimeout(() => elementDone(result * 2), 100)
          })
        })
      }
      const chainDoneCb = (result: number) => console.log(`chain completed with ${result}`);
      [
        (asyncFn: (result: number) => void) => setTimeout(() => asyncFn(1), 200),
        (asyncFn: (result: number) => void) => setTimeout(() => asyncFn(2), 100),
        (asyncFn: (result: number) => void) => setTimeout(() => asyncFn(3), 100),
      ].asynchronousChain(elementHandlerCb, chainDoneCb)
    })
  })
})

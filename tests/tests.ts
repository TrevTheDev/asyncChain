/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai'
// eslint-disable-next-line import/no-unresolved,node/no-missing-import
import asyncChain from '../src/asyncChain'

const asyncFunc = (element: any, time: number) => {
  let fin = false
  const afterTriggers: (() => void)[] = []
  const beforeTriggers: (() => void)[] = []
  const done = (cb: (result: any, lastElement: boolean) => void, lastElement: boolean) => {
    console.log(`done called for : ${element}`)
    if (fin) throw Error('called twice')
    fin = true
    const doneFn = () => {
      beforeTriggers.forEach((trigger) => setImmediate(trigger))
      setImmediate(() => cb(element, lastElement))
      console.log(`done for : ${element}`)
      afterTriggers.forEach((trigger) => setImmediate(trigger))
    }
    if (time) setTimeout(doneFn, time)
    else doneFn()
  }
  return {
    done,
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
//
// const times = (n: number, fn: (index: number) => void) => {
//   const accum = Array(Math.max(0, n))
//   for (let i = 0; i < n; i += 1) accum[i] = fn(i)
// }
//

describe('AsyncChain', () => {
  describe('Basics', () => {
    it('chain should be done and return 0+1+2+3+4+5=15', (done) => {
      const conArray = [0, 1, 2, 3, 4, 5]
      let i = 0
      const chain = asyncChain(
        (element, elementDoneCb, previousResult = 0) => {
          i += 1
          setTimeout(() => {
            element((result: number) => {
              expect(result).to.equal(conArray[i - 1])
              console.log(`${result}`)
              elementDoneCb(
                previousResult + result,
                result >= conArray.length - 1,
              )
            })
          }, 100)
        },
        (result) => {
          debugger
          expect(result).to.equal(15)
          done()
        },
      )

      conArray.forEach((item) => chain.add(asyncFunc(item, 100).done))
      expect(chain.length).to.equal(conArray.length)
    })
    it('items are only added once the chain is empty', (done) => {
      const conArray = [0, 1, 2, 3, 4, 5]
      const testArray = [...conArray]
      let i = 0
      const chain = asyncChain(
        (element, elementDoneCb, previousResult = 0) => {
          i += 1
          setTimeout(() => {
            element((result: number) => {
              expect(result).to.equal(testArray[i - 1])
              console.log(`${result}`)
              elementDoneCb(
                previousResult + result,
                result >= testArray.length - 1,
              )
            })
          }, 100)
        },
        (result) => {
          debugger
          expect(result).to.equal(15)
          done()
        },
        () => {
          expect(chain.queueLength).to.equal(0)
          chain.add(asyncFunc(conArray.shift(), 100).done)
        },
      )
      chain.add(asyncFunc(conArray.shift(), 100).done)
    })
    it('example code works', () => {
      const elementHandlerFn = (
        /* the element asyncChain will iterate over in this case a simple function */
        element: (result: any) => void,
        /* a function to call once the element is done processing */
        elementDone: (result: number, lastElement?: boolean) => any,
        /* the result from the preceeding `elementDone` coll */
        previousResult: undefined | number,
      ) => {
        element((result: number) => {
          console.log(`async element result received: ${result} and previous result: ${previousResult}`)
          setTimeout(() => elementDone(result * 2, result === 3), 100)
        })
      }

      const chainDoneFn = (result: any) => console.log(`chain completed with ${result}`)

      const chain = asyncChain(elementHandlerFn, chainDoneFn)

      chain.add((result: any) => setTimeout(() => result(1), 100))
      chain.add((result: any) => setTimeout(() => result(2), 100))
      chain.add((result: any) => setTimeout(() => result(3), 100))
    })
    it('array function', () => {
      const elementHandlerFn = (
        element: (result: any) => void,
        elementDone: (result: number) => any,
        previousResult: undefined | number,
      ) => {
        element((result: number) => {
          console.log(`async element result received: ${result} and previous result: ${previousResult}`)
          setTimeout(() => elementDone(result * 2), 100)
        })
      }
      const chainDoneFn = (result: number) => {
        console.log(`chain completed with ${result}`)
      }
      [
        (eHandler: any) => setTimeout(() => eHandler(1), 100),
        (eHandler: any) => setTimeout(() => eHandler(2), 100),
        (eHandler: any) => setTimeout(() => eHandler(3), 100),
      ].asyncChain(elementHandlerFn, chainDoneFn)
    })
  })
})

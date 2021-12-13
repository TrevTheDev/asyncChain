/* eslint-disable @typescript-eslint/no-explicit-any */

type ElementDoneCb = (result?: any, lastElement?: boolean) => void

type ChainEmptyCb = () => void

type ElementHandlerCb = (
    element: any,
    elementDone: ElementDoneCb,
    previousResult: any,
    index: number,
    defaultElementHandlerCb?: ElementHandlerCb
) => void

type chain = {
    [index: number]: {
        element: any,
        elementHandlerCb: ElementHandlerCb,
        removeElementFromQueue: ElementDoneCb
    }
}

type ChainDoneCb = (result: any) => void

export interface Chain {
    add: (
        item: any,
        index?: number,
        elementHandlerCb?: ElementHandlerCb
    ) => void
    done: (result: any) => void
    readonly queue: chain
    readonly queueLength: number
    readonly length: number
}

const asyncChain = (
  defaultElementHandlerCb?: ElementHandlerCb,
  chainDoneCb?: ChainDoneCb,
  chainEmptyCb?: ChainEmptyCb,
): Chain => {
  let currentItemIndex = 0
  let autoItemIndex = 0
  const queue: chain = {}
  let done = false
  let previousResult: any
  let processing = false

  const chainDone = (result: any) => {
    done = true
    if (Object.keys(queue).length === 0) {
      if (chainDoneCb) chainDoneCb(result)
    } else throw new Error('done called, but queue is not empty')
  }

  const processNextItem = (): void => {
    setImmediate(() => {
      if (queue[currentItemIndex]) {
        const { element, removeElementFromQueue, elementHandlerCb } = queue[currentItemIndex]
        if (!done && !processing && element !== undefined) {
          // debugger
          processing = true
          elementHandlerCb(
            element,
            removeElementFromQueue,
            previousResult,
            currentItemIndex,
            defaultElementHandlerCb,
          )
          currentItemIndex += 1
        }
      } else if (chainEmptyCb && Object.keys(queue).length === 0) chainEmptyCb()
    })
  }
  return {
    add: (
      element,
      index,
      elementHandlerCb = defaultElementHandlerCb,
    ): void => {
      const key: number = index === undefined ? autoItemIndex : index
      autoItemIndex += 1
      if (done) throw new Error('asyncChain is marked as done, meaning no elements can be added')
      if (queue[key]) throw new Error(`element with index '${index}' already added`)
      if (!elementHandlerCb) throw new Error('no elementHandlerCb provided and one is required')
      queue[key] = {
        element,
        elementHandlerCb,
        removeElementFromQueue: (result: any, lastItem = false) => {
          delete queue[key]
          previousResult = result
          processing = false
          if (lastItem || done) chainDone(result)
          else processNextItem()
        },
      }
      if (!processing) processNextItem()
    },
    done: (result) => chainDone(result),
    get queue() {
      return queue
    },
    get queueLength() {
      return Object.keys(queue).length
    },
    get length() {
      return autoItemIndex
    },
  }
}

declare global {
    /* eslint-disable */
    interface Array<T> {
        asyncChain(elementHandlerCb: ElementHandlerCb, chainDoneCb: ChainDoneCb): void
    }
}

type AElementDoneCb = (result?: any) => void
type AElementHandlerCb = (
    element: any,
    elementDone: AElementDoneCb,
    previousResult: any,
    index: number,
) => void

if (typeof Array.prototype.asyncChain !== 'function') {
    // eslint-disable-next-line no-extend-native,func-names
    Array.prototype.asyncChain = function <T>(
        this: T[],
        elementHandlerCb: AElementHandlerCb,
        chainDoneCb: ChainDoneCb,
    ) {
        // debugger
        const aChain = asyncChain(elementHandlerCb, chainDoneCb)
        const length = this.length - 1
        this.forEach((element, index) => {
            debugger
            if (index === length) {
                aChain.add(
                    element,
                    undefined,
                    (
                        elementA: any,
                        elementDone: ElementDoneCb,
                        previousResult: any,
                        indexA: number,
                    ) => {
                        debugger
                        elementHandlerCb(
                            elementA,
                            (result: any) => elementDone(result, true),
                            previousResult,
                            indexA,
                        )
                    },
                )
            } else aChain.add(element)
        })
        // for (let i = 0; i < length; i += 1)
        //   aChain.add(this[i])
    }
}

// [].forEach((p1: any, p2: number, p3: any[]) => {
// }, undefined)
export default asyncChain

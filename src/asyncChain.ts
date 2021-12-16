/* eslint-disable @typescript-eslint/no-explicit-any */
// noinspection JSUnusedGlobalSymbols

type ElementDone = (result?: any, lastElement?: boolean) => void

type ChainEmptyCb = () => void

type PreviousResultCb = (previousResult: any, elementDone: ElementDone) => void

export type ElementHandlerCb = (
    element: any,
    awaitPreviousResult: (previousResultCb: PreviousResultCb) => void,
    index: number
) => void

export type ElementHandlerCb2 = (
    element: any,
    elementDone: ElementDone,
    previousResult: any,
    index: number
) => void

type chain = {
    [index: number]: {
        element: any,
        elementHandlerCb: ElementHandlerCb,
    }
}

type ResultsAwaitingPreviousResultCb = {
    [index: number]: any
}

type PreviousResultCbsAwaitingResult = {
    [index: number]: {
        previousResultCb: PreviousResultCb,
        elementDone: ElementDone
    }
}

type ChainDoneCb = (result: any) => void

export interface Chain {
    add: (
        item: any,
        index?: number,
        elementHandlerCb?: ElementHandlerCb | ElementHandlerCb2
    ) => void
    done: (result: any) => void
    readonly queue: chain
    readonly queueLength: number
    readonly resultsAwaitingPreviousResultCbLength: number
    readonly previousResultCbsAwaitingResultLength: number
    readonly length: number
}

const asyncChain = (
  defaultElementHandlerCb?: ElementHandlerCb | ElementHandlerCb2,
  chainDoneCb?: ChainDoneCb,
  chainEmptyCb?: ChainEmptyCb,
  processOnlyAfterPreviousElementDone = false,
): Chain => {
  let currentItemIndex = 0
  let autoItemIndex = 0
  const elementHandlerCb2ToElementHandlerCb = (
    elementHandlerCb2: ElementHandlerCb2,
  ): ElementHandlerCb => (
    element,
    awaitPreviousResult,
    index,
  ) => {
    awaitPreviousResult((previousResult, elementDoneCb) => {
      elementHandlerCb2(
        element,
        elementDoneCb,
        previousResult,
        index,
      )
    })
  }

  const defaultElementHandlerCb_: ElementHandlerCb = processOnlyAfterPreviousElementDone
    ? elementHandlerCb2ToElementHandlerCb(<ElementHandlerCb2>defaultElementHandlerCb)
    : <ElementHandlerCb>defaultElementHandlerCb

  const queue: chain = {}
  const resultsAwaitingPreviousResultCb: ResultsAwaitingPreviousResultCb = { 0: undefined }
  const previousResultCbsAwaitingResult: PreviousResultCbsAwaitingResult = {}

  let done = false

  const chainDone = (result: any) => {
    done = true
    if (
      Object.keys(queue).length === 0
            && Object.keys(resultsAwaitingPreviousResultCb).length === 0
            && Object.keys(previousResultCbsAwaitingResult).length === 0) {
      if (chainDoneCb) setImmediate(() => chainDoneCb(result))
    } else throw new Error('done called, but queue is not empty')
  }

  const processNextItem = (): void => {
    setImmediate(() => {
      if (currentItemIndex in queue) {
        const idx = currentItemIndex
        const awaitPreviousResult = (previousResultCb: PreviousResultCb) => {
          const elementDone = (result: any, lastItem = false) => {
            if (lastItem || done) chainDone(result)
            else {
              if (previousResultCbsAwaitingResult[idx + 1]) {
                const {
                  previousResultCb: previousResultCb_,
                  elementDone: elementDone_,
                } = previousResultCbsAwaitingResult[idx + 1]

                setImmediate(() => previousResultCb_(result, elementDone_))
                delete previousResultCbsAwaitingResult[idx + 1]
              } else
                resultsAwaitingPreviousResultCb[idx + 1] = result
              if (processOnlyAfterPreviousElementDone) currentItemIndex += 1
              processNextItem()
            }
          }

          if (idx in resultsAwaitingPreviousResultCb) {
            const result = resultsAwaitingPreviousResultCb[idx]
            setImmediate(() => previousResultCb(result, elementDone))
            delete resultsAwaitingPreviousResultCb[idx]
          } else
            previousResultCbsAwaitingResult[idx] = { previousResultCb, elementDone }
        }

        if (!done) {
          const { element, elementHandlerCb } = queue[currentItemIndex]
          delete queue[currentItemIndex]
          elementHandlerCb(element, awaitPreviousResult, currentItemIndex)
          if (!processOnlyAfterPreviousElementDone) currentItemIndex += 1
        }
      } else if (chainEmptyCb && Object.keys(queue).length === 0) chainEmptyCb()
    })
  }
  return {
    add: (
      element,
      index,
      elementHandlerCb,
    ): void => {
      const key: number = index === undefined ? autoItemIndex : index
      autoItemIndex += 1
      if (done) throw new Error('asyncChain is marked as done, meaning no elements can be added')
      if (queue[key]) {
        throw new Error(`
            element
            with index '${index}'
            already
            added`)
      }
      let elementHandlerCb_: ElementHandlerCb
      if (!elementHandlerCb && !defaultElementHandlerCb) throw new Error('no elementHandlerCb provided and one is required')
      if (!elementHandlerCb) elementHandlerCb_ = defaultElementHandlerCb_
      else {
        elementHandlerCb_ = processOnlyAfterPreviousElementDone
          ? elementHandlerCb2ToElementHandlerCb(<ElementHandlerCb2>elementHandlerCb)
          : <ElementHandlerCb>elementHandlerCb
      }

      queue[key] = {
        element,
        elementHandlerCb: elementHandlerCb_,
      }
      processNextItem()
    },
    done: (result) => chainDone(result),
    get queue() {
      return queue
    },
    get queueLength() {
      return Object.keys(queue).length
    },
    get resultsAwaitingPreviousResultCbLength() {
      return Object.keys(resultsAwaitingPreviousResultCb).length
    },
    get previousResultCbsAwaitingResultLength() {
      return Object.keys(previousResultCbsAwaitingResult).length
    },
    get length() {
      return autoItemIndex
    },
  }
}

export type AElementDoneCb = (result?: any) => void
export type APreviousResultCb = (
    previousResult: any,
    elementDone: AElementDoneCb
) => void
export type AElementHandlerCb = (
    element: any,
    awaitPreviousResult: (previousResultCb: APreviousResultCb) => void,
    index: number,
) => void

declare global {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Array<T> {
        asyncChain(elementHandlerCb: AElementHandlerCb, chainDoneCb: ChainDoneCb): void
    }
}

if (typeof Array.prototype.asyncChain !== 'function') {
  // eslint-disable-next-line func-names,no-extend-native
  Array.prototype.asyncChain = function (
    this: [],
    elementHandlerCb: AElementHandlerCb,
    chainDoneCb: ChainDoneCb,
  ) {
    const aChain = asyncChain(elementHandlerCb, chainDoneCb)
    const length = this.length - 1
    this.forEach((element, index) => {
      if (index === length) {
        aChain.add(
          element,
          undefined,
          (
            elementA: any,
            awaitPreviousResult: (previousResultCb: PreviousResultCb) => void,
            indexA: number,
          ) => {
            elementHandlerCb(
              elementA,
              (previousResultCb: PreviousResultCb) => {
                awaitPreviousResult((previousResult, elementDone) => {
                  previousResultCb(previousResult, (result) => elementDone(result, true))
                })
              },
              indexA,
            )
          },
        )
      } else aChain.add(element)
    })
  }
}

export default asyncChain

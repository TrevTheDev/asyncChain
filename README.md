# asyncChain

`asyncChain` provides an array processor that can handle elements in an asynchronous and lazy manner.   `asyncChain` is
similar to `map`, `forEach`, `filter` and `reduce` except that it is designed to work asynchronously. It is useful if:

* elements are required to be processed asynchronously;
* elements must be processed sequentially;
* the array may not exist, or be fully known or complete but processing should proceed as elements are known or required
  to be processed [optional]; or
* one is coding in a lazy (pull) style, where elements are only processes as and when needed.

# How To Use

## Installation

```shell
npm install @trevthedev/asyncchain
```

## Basic Usage

```typescript
import asyncChain from '@trevthedev/asyncChain'

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

```

## Array Prototype Usage

```typescript
import asyncChain from '@trevthedev/asyncChain'

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

```

## asyncChain(defaultElementHandlerCb, chainDoneCb, chainEmptyCb)

* `defaultElementHandlerCb`? \<

  [`ElementHandlerCb`](#elementhandlercb-element-elementdonecb-previousresult-index-defaultelementhandlercb)> optional
  default function to process elements

* `chainDoneCb`? \< [`ChainDoneCb`](#chaindonecbresult) > optional callback made once the chain is done processing
  returning the result of the last `ElementDone`

* `chainEmptyCb`? <[`ChainEmptyCb`](#chainemptycb)> optional callback made whenever there are no more items in the
  chain.

* Returns: [`Chain`](#chain)

## Chain

### chain.add(element, index, elementHandlerCb)

Adds an element to the chain for processing.

* `element` \<`any`> the element being added to the chain
* `index`? \<`number`> if provided the user must provide all elements sequentially starting with zero without any
  gaps,or the chain will not process correctly. Elements need not be added in sequence.
* `elementHandlerCb` ?
  \<[`ElementHandlerCb`](#elementhandlercb-element-elementdonecb-previousresult-index-defaultelementhandlercb)>
  optional `ElementHandlerCb`which must be provided if a `defaultElementHandlerCb` was not provided.

### chain.queue

Returns an object that contains all of the elements awaiting processing. Doesn't include any elements already processed.

### chain.queueLength

Returns the number of elements in the process of being or awaiting processing.

### chain.length

Returns the total number of elements `add`ed to the chain.

### chain.done(result)

If there are no elements enqueued, then `chain.done` can be called to mark the chain as complete and no further elements
will be able to be added.

* `result` \<`any`> the final result passed to the `chainDoneCb`

## ElementHandlerCb (element, elementDoneCb, previousResult, index, defaultElementHandlerCb)

This is the callback to process an element in the array. It can be specified as a `defaultElementHandlerCb` which
applies to all elements that do not include an `elementHandlerCb` when added.

* `element` \<`any`> the element to be handled
* `elementDone` \<`(result?: any, lastElement?: boolean) => void`>  function called to signal that the element has been
  processed and the chain can proceed to the next element if being processed sequentially.
* `previousResult` \<`any`> any `result` returned via the previous element's `elementDone` callback
* `index` \<`number`> the zero based index of this element
* `defaultElementHandlerCb` \<`ElementHandlerCb` | `undefined`> if a `defaultElementHandlerCb` is provided and
  an `elementHandlerCb` is also provided, then this optional callback is provided on the `elementHandlerCb` so that
  the `defaultElementHandlerCb`  may be called if required
* returns `void`

## ElementDone(result, lastElement)

* `result`? \<`any`> optional result returned from processing this element
* `lastElement`? \<`boolean=false`>  if true is returned the chain is considered done and no further items can be added,
  and if any items remain in the queue an error will be thrown. The user must ensure that any async elements processed
  have all returned `elementDone` before flagging the chain as `done`

## ChainDoneCb(result)

This callback is made after the `lastElement` was specified as true via `ElementDone`, or after `chain.done` is called.
If after this callback any items remain in the chain an error will be thrown. An error will be thrown if `chain.add` is
called.

* `result` \<`any`> result returned from`ElementDone` or `chain.done`

## ChainEmptyCb()

This callback is made every time the chain contains no further elements to process.

# Assumption & Limitation

`asyncChain` provides no error handling for errors that may occur during the processing of an element. If an error
should occur it should be appropriately handled so as to not leave any enqueued elements in an un-processable state.
`asyncChain` tracks the start of async calls sequentially and only processes one async call at a time, however some use
cases will exist where the start need not be sequential and processing can be paralleled, but where the end results need
to be processed sequential. It would not be hard to modify this code to do so, but for simplicity, its not been done.
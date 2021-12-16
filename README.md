# asyncChain

`asyncChain` provides an array processor that handle array elements in an asynchronous and lazy manner.   `asyncChain`
is aligned to `map`, `forEach`, `filter` and `reduce` but it is designed to work asynchronously. It is useful if:

* array elements are required to be processed asynchronously;
* results from element processing must be returned sequentially;
* element are to be processed in parallel or in series;
* the array may not exist, or be fully known or complete but processing should proceed as elements are known or required
  to be processed;
* the array may never be complete; or
* one is coding in a lazy (pull) style, where elements are only processes as and when needed.

# How To Use

## Installation

```shell
npm install @trevthedev/asyncchain
```

## Basic Usage

```typescript
import asyncChain from '@trevthedev/asyncChain'

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

const chain = asyncChain(elementHandlerCb, chainDoneCb)

chain.add((asyncFn: any) => setTimeout(() => asyncFn(1), 200))
chain.add((asyncFn: any) => setTimeout(() => asyncFn(2), 100))
chain.add((asyncFn: any) => setTimeout(() => asyncFn(3), 100))
```

## Serial Usage

By default, async elements are passed to the `elementHandlerCb` as they are added. Elements may require the result from
their predecessor before being finalised this is provided
by [`awaitPreviousResult`](#elementhandlercb-element-awaitpreviousresult-index) - however if elements are processed in
series then this can be done away with and a
simplified [`elementHandlerCb`](#elementhandlercb-element-elementdone-previousresult-index) can be used. This approach
in general disallows parallel processing and so may be less performant.

```typescript
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

const chain = asyncChain(elementHandlerCb, chainDoneCb, undefined, true)

chain.add((asyncFn: any) => setTimeout(() => asyncFn(1), 100))
chain.add((asyncFn: any) => setTimeout(() => asyncFn(2), 100))
chain.add((asyncFn: any) => setTimeout(() => asyncFn(3), 100))
```

## Array Prototype Usage

If the array is complete and will not change, then an `Array.prototype` method is provided to simplify usage:

```typescript
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
].asyncChain(elementHandlerCb, chainDoneCb)
```

## asyncChain(defaultElementHandlerCb, chainDoneCb, chainEmptyCb)

* [`defaultElementHandlerCb`](#asyncchaindefaultelementhandlercb-chaindonecb-chainemptycb)?
  \<[`ElementHandlerCb`](#elementhandlercb)> optional default function to process elements

* `chainDoneCb`? \< [`ChainDoneCb`](#chaindonecbresult) > optional callback made once the chain is done processing
  returning the result of the last `ElementDone`

* `chainEmptyCb`? <[`ChainEmptyCb`](#chainemptycb)> optional callback made whenever there are no more items in the
  chain.
* `processOnlyAfterPreviousElementDone` <`boolean=false`> whether to only start processing each element after its
  predecessor has called `elementDone` or whether each element should start processing as soon as it is added (default).

* Returns: [`Chain`](#chain)

## Chain

### chain.add(element, index, elementHandlerCb)

Adds an element to the chain for processing.

* `element` \<`any`> the element to add to the chain
* `index`? \<`number`> optional index, if provided the user must provide all elements sequentially starting with zero
  without any gaps, or the chain will not process correctly. Elements need not be added in sequence, but will remain
  unprocessed until all predecessor elements have been added.
* `elementHandlerCb` ? \<[`ElementHandlerCb`](#elementhandlercb)>  optional `ElementHandlerCb`which must be provided if
  a [`defaultElementHandlerCb`](#asyncchaindefaultelementhandlercb-chaindonecb-chainemptycb) was not provided.

### chain.queue

Returns an object that contains all elements awaiting processing. Doesn't include any elements already processed.

### chain.queueLength

Returns the number of elements in the process of being or awaiting processing.

### chain.length

Returns the total number of elements [`add`ed](#chainaddelement-index-elementhandlercb) to the chain.

### chain.done(result)

If there are no elements enqueued, then `chain.done` can be called to mark the chain as complete and no further elements
will be able to be added.

* `result` \<`any`> the final result passed to the [`ChainDoneCb`](#chaindonecbresult)

## ElementHandlerCb

This is the callback to process an element in the array. It can be specified as
a [`defaultElementHandlerCb`](#asyncchaindefaultelementhandlercb-chaindonecb-chainemptycb) which applies to all elements
that do not include an [`elementHandlerCb`](#chainaddelement-index-elementhandlercb) when added.

It takes two forms depending on the flag `processOnlyAfterPreviousElementDone` - see below. The first form provides a
callback: `awaitPreviousResultCb` which is called once a result is returned from the previous element, or immediately if
the first element.

In the second form it is called once a result is returned from the previous element, or immediately if the first
element.

### ElementHandlerCb (element, awaitPreviousResult, index)

* `element` \<`any`> the element to be handled
* `awaitPreviousResult` \<`(previousResultCb: PreviousResultCb) => void`>  function called after the previous element
  returns its result.  `previousResultCb` provides a function `elementDone` to enable this element to return its result.
* `index` \<`number`> the zero based index of this element

### ElementHandlerCb (element, elementDone, previousResult, index)

* `element` \<`any`> the element to be handled
* `elementDone` \<[`ElementDone`](#elementdoneresult-lastelement)>  function called to signal that the element has been
  processed and the chain can proceed to the next element.
* `previousResult` \<`any`> the`result` returned via the previous element's `elementDone` function
* `index` \<`number`> the zero based index of this element

## PreviousResultCb(previousResult, elementDone)

* `previousResult` \<`any`> result returned from processing the previous element
* `elementDone` \<[`ElementDone`](#elementdoneresult-lastelement)>  function called to signal that the element has been
  processed and the chain can proceed to the next element.

## ElementDone(result, lastElement)

* `result`? \<`any`> optional result returned from processing this element
* `lastElement`? \<`boolean=false`>  if true is returned the chain is considered done and no further items can be added,
  and if any items remain in the queue an error will be thrown. The user must ensure that any async elements processed
  have all returned `elementDone` before flagging the chain as `done`

## ChainDoneCb(result)

This callback is made after the `lastElement` was specified as true via [`ElementDone`](#elementdoneresult-lastelement),
or after `chain.done` is called. If after this callback any items remain in the chain an error will be thrown. An error
will be thrown if `chain.add` is called after `ChainDoneCb`.

* `result` \<`any`> result returned from last`ElementDone` or `chain.done`

## ChainEmptyCb()

This callback is made every time the chain contains no further elements to process.

# Limitation

`asyncChain` provides no handling for errors that may occur during the processing of an element. If an error occurs it
should be appropriately handled to not leave any enqueued elements in an un-processable state.
/****************************************************************************
 Copyright (c) 2022 Xiamen Yaji Software Co., Ltd.
 
 http://www.cocos.com
 
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.
 
 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
 #pragma once

#include "base/Macros.h"
namespace cc {
namespace event {
namespace intl {

template <typename ListNode>
bool listAppend(ListNode **head, ListNode *newNode) {
    if (newNode->next != nullptr || newNode->prev != nullptr) {
        CC_ASSERT(false);
        return false;
    }
    if (*head == nullptr) {
        newNode->next = newNode;
        newNode->prev = newNode;
        *head = newNode;
    } else {
        auto *first = *head;
        auto *last = (*head)->prev;
        newNode->prev = last;
        newNode->next = first;
        first->prev = newNode;
        last->next = newNode;
    }
    return true;
}

template <typename ListNode>
bool detachFromList(ListNode **head, ListNode *node) {
    if (*head == nullptr || node->prev == nullptr || node->next == nullptr) {
        CC_ASSERT(false);
        return false;
    }
    if (node->prev == node && node->next == node) { // the only node
        CC_ASSERT(node == *head);                      // should be the first
        *head = nullptr;
    } else {
        auto *nextNode = node->next;
        auto *prevNode = node->prev;
        nextNode->prev = prevNode;
        prevNode->next = nextNode;
        if (node == *head) {
            *head = nextNode;
        }
    }
    node->prev = nullptr;
    node->next = nullptr;
    return true;
}

} // namespace intl
} // namespace event
} // namespace cc

#define EVENT_LIST_LOOP_BEGIN(tempVar, list) \
    if (list) {                              \
        auto *tempVar = list;                \
        do {                                 \
            auto *nextCopy = tempVar->next;

#define EVENT_LIST_LOOP_END(tempVar, list) \
    tempVar = nextCopy;                    \
    }                                      \
    while (tempVar != list)                \
        ;                                  \
    }

#define EVENT_LIST_LOOP_REV_BEGIN(tempVar, list) \
    if (list) {                                  \
        auto *tempVar = list->prev;              \
        bool isLastListNode = false;             \
        do {                                     \
            auto *nextCopy = tempVar->prev;      \
            isLastListNode = tempVar == list;

#define EVENT_LIST_LOOP_REV_END(tempVar, list) \
    tempVar = nextCopy;                        \
    }                                          \
    while (!isLastListNode)                    \
        ;                                      \
    }

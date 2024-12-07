![CI/CD](https://github.com/irvinm/TST-Lock/workflows/CI/CD/badge.svg) ![Mozilla Add-on](https://img.shields.io/amo/users/TST-Lock.svg?style=flat-square) ![](https://img.shields.io/amo/v/TST-Lock.svg?style=flat-square)

<!-- Can also get # of downloads per week:  https://img.shields.io/amo/dw/TST-Lock.svg?style=flat-square -->
<!-- Github badges:  https://shields.io/search?q=github -->
<!-- Mozilla badges:  https://shields.io/search?q=mozilla -->
<!-- https://shields.io/badges -->
<!-- https://github.com/badges/shields -->

# TST Lock

This project extends "Tree Style Tab" to help users from accidentally closing a tab via the "X" for tabs that you consider important.  Holding "Ctrl + Shift" while clicking on a tab will toggle the "X" with a lock graphic which is non-interactive. (Simply repeat the process to toggle the lock graphic back to the normal "X")  You can still close the tab (even with the lock displayed) by right-clicking on the tab and selecting "Close Tab".

Original TST discussion: https://github.com/piroor/treestyletab/issues/2104

Currently defect/enhancement requests:  https://github.com/irvinm/TST-Lock/issues

------

You can change how the lock graphic is sized and positioned by using TST CSS.

In my screenshot example on AMO, I used the following CSS to customize to my liking:

```
#tabbar tab-item.locked tab-closebox {
  display: initial;
  height: 36px;
  width: 18px; 
  transform: scale(1.3);
  opacity: 1 !important;
}
```

![2022-04-18_19-35-23](https://user-images.githubusercontent.com/979729/163903182-23db7fe1-c8b0-42f1-a151-58212fb9897e.png)

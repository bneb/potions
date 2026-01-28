
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './scorpion.module.css';

interface ScorpionProps {
    className?: string;
}

export function Scorpion({ className }: ScorpionProps) {
    return (
        <div className={cn(styles.scorpionProxy, className)}>
            <div className={styles.scorpionScene}>
                <div className={styles.scorpion}>
                    <div className={styles.tail}>
                        <div className={styles.stinger}></div>
                    </div>

                    <div className={styles.body}>
                        <div className={styles.segment}></div>
                        <div className={styles.segment}></div>
                        <div className={styles.segment}></div>
                    </div>

                    <div className={styles.head}>
                        <div className={styles.eyeLeft}></div>
                        <div className={styles.eyeRight}></div>
                    </div>

                    <div className={cn(styles.claw, styles.cLeft)}>
                        <div className={styles.pincer}></div>
                    </div>
                    <div className={cn(styles.claw, styles.cRight)}>
                        <div className={styles.pincer}></div>
                    </div>

                    <div className={cn(styles.leg, styles.l1Left)}></div>
                    <div className={cn(styles.leg, styles.l1Right)}></div>
                    <div className={cn(styles.leg, styles.l2Left)}></div>
                    <div className={cn(styles.leg, styles.l2Right)}></div>
                    <div className={cn(styles.leg, styles.l3Left)}></div>
                    <div className={cn(styles.leg, styles.l3Right)}></div>
                </div>
            </div>
        </div>
    );
}

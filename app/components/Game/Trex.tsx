
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './trex.module.css';

interface TrexProps {
    className?: string;
}

export function Trex({ className }: TrexProps) {
    return (
        <div className={cn(styles.trexProxy, className)}>
            <div className={styles.trexScene}>
                <div className={styles.trex}>
                    {/* Tail */}
                    <div className={styles.tail}></div>

                    {/* Legs */}
                    <div className={cn(styles.leg, styles.lLeft)}>
                        <div className={styles.foot}>
                            <div className={styles.claw}></div>
                            <div className={styles.claw}></div>
                        </div>
                    </div>
                    <div className={cn(styles.leg, styles.lRight)}>
                        <div className={styles.foot}>
                            <div className={styles.claw}></div>
                            <div className={styles.claw}></div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className={styles.body}>
                        <div className={styles.belly}></div>
                    </div>

                    {/* Arms */}
                    <div className={cn(styles.arm, styles.aLeft)}>
                        <div className={styles.claw}></div>
                        <div className={styles.claw}></div>
                    </div>
                    <div className={cn(styles.arm, styles.aRight)}>
                        <div className={styles.claw}></div>
                        <div className={styles.claw}></div>
                    </div>

                    {/* Head */}
                    <div className={styles.head}>
                        <div className={styles.snout}>
                            <div className={styles.nostril}></div>
                            <div className={styles.teeth}></div>
                        </div>
                        <div className={styles.eye}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}


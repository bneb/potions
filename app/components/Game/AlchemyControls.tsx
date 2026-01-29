"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import styles from './alchemyControls.module.css';

interface AlchemyControlsProps {
    heat: number;
    intensity: number;
    brewTime: number;
    isBrewing: boolean;
    onHeatChange: (heat: number) => void;
    onIntensityChange: (intensity: number) => void;
    onStartBrew: () => void;
    onStopBrew: () => void;
    disabled?: boolean;
}

export function AlchemyControls({
    heat,
    intensity,
    brewTime,
    isBrewing,
    onHeatChange,
    onIntensityChange,
    onStartBrew,
    onStopBrew,
    disabled = false,
}: AlchemyControlsProps) {

    // Heat dial: tap to cycle through 1-5
    const handleHeatTap = useCallback(() => {
        if (disabled) return;
        const nextHeat = heat >= 5 ? 1 : heat + 1;
        onHeatChange(nextHeat);
    }, [heat, onHeatChange, disabled]);

    // Intensity slider state
    const intensityRef = useRef<HTMLDivElement>(null);
    const [isDraggingIntensity, setIsDraggingIntensity] = useState(false);

    const handleIntensityStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        setIsDraggingIntensity(true);
    }, [disabled]);

    const handleIntensityMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDraggingIntensity || !intensityRef.current) return;

        const rect = intensityRef.current.getBoundingClientRect();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const relativeY = (rect.bottom - clientY) / rect.height;
        const newIntensity = Math.max(0, Math.min(2, relativeY * 2));
        onIntensityChange(Math.round(newIntensity * 10) / 10);
    }, [isDraggingIntensity, onIntensityChange]);

    const handleIntensityEnd = useCallback(() => {
        setIsDraggingIntensity(false);
    }, []);

    useEffect(() => {
        if (isDraggingIntensity) {
            window.addEventListener('mousemove', handleIntensityMove);
            window.addEventListener('mouseup', handleIntensityEnd);
            window.addEventListener('touchmove', handleIntensityMove);
            window.addEventListener('touchend', handleIntensityEnd);
            return () => {
                window.removeEventListener('mousemove', handleIntensityMove);
                window.removeEventListener('mouseup', handleIntensityEnd);
                window.removeEventListener('touchmove', handleIntensityMove);
                window.removeEventListener('touchend', handleIntensityEnd);
            };
        }
    }, [isDraggingIntensity, handleIntensityMove, handleIntensityEnd]);

    // Format brew time as "X.Xs"
    const formatTime = (seconds: number) => {
        return `${seconds.toFixed(1)}s`;
    };

    return (
        <div className={styles.controls}>
            {/* Heat Dial */}
            <div className={cn(styles.controlGroup, disabled && styles.disabled)}>
                <div className={styles.controlLabel}>
                    <span className={styles.labelEmoji}>🔥</span>
                    <span>Heat</span>
                </div>
                <button
                    className={styles.heatDial}
                    onClick={handleHeatTap}
                    disabled={disabled}
                    aria-label={`Heat level ${heat}`}
                >
                    <div className={styles.heatRing}>
                        {[1, 2, 3, 4, 5].map((level) => (
                            <div
                                key={level}
                                className={cn(
                                    styles.heatNotch,
                                    level <= heat && styles.active
                                )}
                                style={{
                                    transform: `rotate(${(level - 1) * 45 - 90}deg) translateX(30px)`,
                                }}
                            />
                        ))}
                    </div>
                    <div className={styles.heatCenter}>
                        <div className={styles.heatFlames}>
                            {Array.from({ length: heat }, (_, i) => (
                                <span
                                    key={i}
                                    className={styles.flame}
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    🔥
                                </span>
                            ))}
                        </div>
                    </div>
                </button>
                <div className={styles.heatLevel}>
                    Level {heat}
                </div>
            </div>

            {/* Intensity Slider */}
            <div className={cn(styles.controlGroup, disabled && styles.disabled)}>
                <div className={styles.controlLabel}>
                    <span className={styles.labelEmoji}>💪</span>
                    <span>Power</span>
                </div>
                <div
                    ref={intensityRef}
                    className={styles.intensitySlider}
                    onMouseDown={handleIntensityStart}
                    onTouchStart={handleIntensityStart}
                >
                    <div className={styles.sliderTrack}>
                        {/* Danger zone (top third) */}
                        <div className={styles.dangerZone} />

                        {/* Fill level */}
                        <div
                            className={styles.sliderFill}
                            style={{ height: `${(intensity / 2) * 100}%` }}
                        />

                        {/* Bubble decorations */}
                        <div className={styles.sliderBubbles}>
                            <div className={styles.smallBubble} />
                            <div className={styles.smallBubble} />
                            <div className={styles.smallBubble} />
                        </div>
                    </div>

                    {/* Slider handle */}
                    <div
                        className={cn(
                            styles.sliderHandle,
                            isDraggingIntensity && styles.dragging
                        )}
                        style={{ bottom: `${(intensity / 2) * 100}%` }}
                    >
                        <div className={styles.handleGrip}>
                            <div className={styles.gripLine} />
                            <div className={styles.gripLine} />
                            <div className={styles.gripLine} />
                        </div>
                    </div>
                </div>
                <div className={styles.intensityValue}>
                    {intensity <= 0.5 ? '😌' : intensity <= 1.0 ? '😊' : intensity <= 1.5 ? '😤' : '🤯'}
                </div>
            </div>

            {/* Timer / Brew Button */}
            <div className={cn(styles.controlGroup, disabled && styles.disabled)}>
                <div className={styles.controlLabel}>
                    <span className={styles.labelEmoji}>⏱️</span>
                    <span>Timer</span>
                </div>

                {/* Hourglass Timer Display */}
                <div className={styles.timerDisplay}>
                    <div className={cn(styles.hourglass, isBrewing && styles.flowing)}>
                        <div className={styles.hourglassTop}>
                            <div
                                className={styles.sand}
                                style={{
                                    height: isBrewing ? `${Math.max(0, 100 - (brewTime / 10) * 100)}%` : '80%'
                                }}
                            />
                        </div>
                        <div className={styles.hourglassNeck} />
                        <div className={styles.hourglassBottom}>
                            <div
                                className={styles.sand}
                                style={{
                                    height: isBrewing ? `${Math.min(100, (brewTime / 10) * 100)}%` : '0%'
                                }}
                            />
                        </div>
                    </div>
                    <div className={styles.timeReadout}>
                        {formatTime(brewTime)}
                    </div>
                </div>

                {/* Start/Stop Button */}
                <button
                    className={cn(
                        styles.brewButton,
                        isBrewing && styles.brewing
                    )}
                    onClick={isBrewing ? onStopBrew : onStartBrew}
                    disabled={disabled}
                >
                    {isBrewing ? (
                        <>
                            <span className={styles.stopIcon}>⏹️</span>
                            <span>Stop</span>
                        </>
                    ) : (
                        <>
                            <span className={styles.playIcon}>▶️</span>
                            <span>Brew!</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default AlchemyControls;

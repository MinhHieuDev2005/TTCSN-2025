import {useEffect, useRef, useState} from 'react';

// ponytail: poll mounted screens every 10 seconds; use server events when traffic needs incremental updates.
export function startBackgroundRefresh(reload, setStale) {
	let stopped = false;
	let timer;
	let controller;
	let resumePending = false;
	const schedule = () => {
		clearTimeout(timer);
		if (!stopped && !document.hidden && navigator.onLine !== false) timer = setTimeout(run, 10000);
	};
	const run = async () => {
		clearTimeout(timer);
		if (stopped || document.hidden || navigator.onLine === false || controller) return;
		const request = new AbortController();
		controller = request;
		const deadline = setTimeout(() => { request.abort(); if (!stopped) setStale(true); }, 15000);
		try {
			await reload(request.signal);
			if (!stopped && !request.signal.aborted) setStale(false);
		} catch {
			if (!stopped && !request.signal.aborted) setStale(true);
		} finally {
			clearTimeout(deadline);
			request.abort();
			controller = null;
			if (resumePending && !stopped) { resumePending = false; run(); }
			else schedule();
		}
	};
	const resume = () => {
		if (document.hidden || navigator.onLine === false) return;
		if (controller?.signal.aborted) resumePending = true;
		else run();
	};
	const pause = () => { clearTimeout(timer); controller?.abort(); };
	const visibility = () => document.hidden ? pause() : resume();
	const offline = () => { pause(); setStale(true); };
	document.addEventListener('visibilitychange', visibility);
	window.addEventListener('focus', resume);
	window.addEventListener('online', resume);
	window.addEventListener('offline', offline);
	if (navigator.onLine === false) setStale(true);
	schedule();
	return () => {
		stopped = true;
		pause();
		document.removeEventListener('visibilitychange', visibility);
		window.removeEventListener('focus', resume);
		window.removeEventListener('online', resume);
		window.removeEventListener('offline', offline);
	};
}

export default function useBackgroundRefresh(reload, enabled = true) {
	const callback = useRef(reload);
	const [stale, setStale] = useState(false);
	useEffect(() => { callback.current = reload; }, [reload]);
	useEffect(() => {
		if (enabled) return startBackgroundRefresh(signal => callback.current(signal), setStale);
	}, [enabled]);
	return stale;
}

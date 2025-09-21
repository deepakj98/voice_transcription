import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
	static targets =
		[	
			"live",
			"full",
			"start",
			"stop",
			"summary"
		]

	connect() {
		console.log("Transcribe controller connected.")

		this.recognition = null
		this.mediaRecorder = null
		this.chunks = []
		this.finalTranscript = ''
		this.audioBlob = null
    this.mediaStream = null
	}

	async start() {
		this.finalTranscript = ''
    this.chunks = []
    this.audioBlob = null
    this.fullTarget.textContent = ''
    this.summaryTarget.textContent = ''
		this.startTarget.disabled = true
		this.stopTarget.disabled = false
		this.liveTarget.textContent = 'Initializing...'

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			this.mediaStream = stream
			this.startMediaRecorder(stream)
		} catch (err) {
			console.error('microphone access denied', err)
			this.liveTarget.textContent = 'Microphone access denied.'
			return
		}

		// Start Web Speech API for live transcription (if available)
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
		if (SpeechRecognition) {
			this.recognition = new SpeechRecognition()
			this.recognition.continuous = true
			this.recognition.interimResults = true
			this.recognition.lang = 'en-US'

			this.recognition.onresult = (event) => {
				let interim = ''
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					const res = event.results[i]
					if (res.isFinal) {
						this.finalTranscript += res[0].transcript + ' '
						this.fullTarget.textContent = this.finalTranscript
					} else {
						interim += res[0].transcript
					}
				}

				this.liveTarget.textContent = this.finalTranscript + interim
				}

				this.recognition.onerror = (e) => console.error('recognition error', e)
				this.recognition.onend = () => console.log('recognition ended')
				this.recognition.start()

		} else {
			this.liveTarget.textContent = 'Live transcription not supported in this browser. Recording audio only.'
		}
	}

	stop() {
		this.startTarget.disabled = false
		this.stopTarget.disabled = true

		if (this.recognition) {
			try { this.recognition.stop() } catch(e) { }
			this.recognition = null
		}

		if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
			this.mediaRecorder.stop()
		} else if (this.mediaStream) {
			this.mediaStream.getTracks().forEach(t => t.stop())
		}

		// finalize full transcription
		this.fullTarget.textContent = this.finalTranscript

		setTimeout(() => this.upload(), 200)
	}

	startMediaRecorder(stream) {
		try {
			this.mediaRecorder = new MediaRecorder(stream)
		} catch (e) {
			console.warn('MediaRecorder not supported', e)
			this.liveTarget.textContent = 'Recording not supported.'
			return
		}

		this.chunks = []
		this.mediaRecorder.ondataavailable = (ev) => {
			if (ev.data && ev.data.size) this.chunks.push(ev.data)
		}

		this.mediaRecorder.onstop = async () => {
			this.audioBlob = new Blob(this.chunks, { type: this.chunks[0]?.type || 'audio/webm' })
		}

		this.mediaRecorder.start(1000) // collect 1s chunks
	}


	async upload() {
		const form = new FormData()
		form.append('text', this.finalTranscript || '')
		
		if (this.audioBlob) {
			const filename = `recording_${Date.now()}.webm`
			form.append('audio', this.audioBlob, filename)
		}

		this.liveTarget.textContent = 'Uploading...'

		try {
			const resp = await fetch('/transcriptions', { method: 'POST', body: form })
			const json = await resp.json()
			
			if (!resp.ok) throw new Error(json.error || JSON.stringify(json))

			this.liveTarget.textContent = 'Uploaded — fetching summary...'


			const summaryResp = await fetch(`/summary/${json.id}`)
			const summaryJson = await summaryResp.json()

			if (summaryResp.ok) {
				this.summaryTarget.textContent = summaryJson.summary
			} else {
				this.summaryTarget.textContent = 'Summary failed: ' + (summaryJson.error || JSON.stringify(summaryJson))
			}
		} catch (err) {
			console.error('upload error', err)
			this.liveTarget.textContent = 'Upload failed: ' + err.message
		}
	}
}

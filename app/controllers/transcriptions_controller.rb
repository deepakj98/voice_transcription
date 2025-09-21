class TranscriptionsController < ApplicationController
  skip_forgery_protection only: [:create]


  def new
  end

  def create
    transcription_text = params[:text].to_s.strip
    if transcription_text.blank?
      render json: { error: 'No transcription text provided' }, status: :unprocessable_entity
      return
    end

    t = Transcription.new(text: transcription_text)
    if params[:audio]
      t.audio.attach(params[:audio])
    end


    if t.save
      render json: { id: t.id, message: 'Saved' }, status: :created
    else
      render json: { errors: t.errors.full_messages }, status: :unprocessable_entity
    end
  end


  def show
    t = Transcription.find(params[:id])
    render json: { id: t.id, text: t.text, summary: t.summary }
  end

  #returns or generates summary of transcription
  def summary
    t = Transcription.find(params[:id])
    
    if t.summary.present?
      render json: { id: t.id, summary: t.summary }
      return
    end

    summarizer = Summarizer.new
    summary_text = summarizer.summarize(t.text)

    t.update(summary: summary_text)

    render json: { id: t.id, summary: summary_text }
    rescue Summarizer::Error => e
      render json: { error: e.message }, status: :bad_gateway
  end
end

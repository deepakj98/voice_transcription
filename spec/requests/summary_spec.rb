require 'rails_helper'

RSpec.describe "Summaries", type: :request do
  describe "GET /summary/:id" do
    let!(:transcription) do
      Transcription.create!(text: "John: Let's fix this. Doe: We'll fix this as soon as possible.")
    end

    context "when a summary does not exist yet" do
      it "calls the Summarizer, returns the summary and caches it" do
        fake_summary = "- John noticed a problem\n- Doe will fix this as soon as possible\n"
        allow_any_instance_of(Summarizer).to receive(:summarize).with(transcription.text).and_return(fake_summary)

        get "/summary/#{transcription.id}"
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json["id"]).to eq(transcription.id)
        expect(json["summary"]).to eq(fake_summary)

        transcription.reload
        expect(transcription.summary).to eq(fake_summary)
      end
    end

    context "when Summarizer raises an error" do
      it "returns 502 and an error message" do
        allow_any_instance_of(Summarizer).to receive(:summarize).and_raise(Summarizer::Error.new("provider down"))
        get "/summary/#{transcription.id}"

        expect(response).to have_http_status(:bad_gateway)
        json = JSON.parse(response.body)
        expect(json["error"]).to match(/provider down/)
      end
    end
  end
end

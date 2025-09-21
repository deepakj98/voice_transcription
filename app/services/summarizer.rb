class Summarizer
	class Error < StandardError; end

	def initialize
		@client = OpenAI::Client.new(access_token: ENV['OPENAI_API_KEY'])
	end

	def summarize(text)
		raise Error, 'No text' if text.to_s.strip.empty?

		# Small prompt — adjust for better quality
		prompt = <<~PROMPT
		Summarize the following conversation's key points and action items in 3-5 short points. Keep it concise.

		Conversation:
		#{text}
		PROMPT

		response = @client.chat(parameters: {
			model: "gpt-4o",
			messages: [{ role: "system", content: prompt }],
			temperature: 1.0
		})

		# Adapt to the openai gem response shape
		choices = response.dig("choices") || response.dig(:choices)

		if choices && choices.first && choices.first["message"]
			choices.first["message"]["content"]
		else
			response.to_s
		end

		rescue => e
			raise Error, "Summarization failed: #{e.message}"
	end
end

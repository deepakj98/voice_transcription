class Transcription < ApplicationRecord
	has_one_attached :audio
	validates :text, presence: true
end
